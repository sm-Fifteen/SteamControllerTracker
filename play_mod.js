var {SteamControllerSequence, SteamControllerPlayer} = require("steam-controller-player");
var {StopRoutine, Pulse, ArpeggioNote, PortamentoNote, VibratoNote, FlatNote} = require("./sc_music.js");

const OpenMTP_Module = require('node-libopenmpt');
var program = require('commander');
var Promise = require("bluebird");
const fs = require('fs');

Promise.config({cancellation: true})

program
	.arguments('<trackerFile>')
	.description('Reads a tracker file (MOD/XM/IT/S3M, etc.) and ' +
			'attempts to play it on a connected Steam Controller')
	.option('-c, --channels <chan1,chan2,chan3>', 'Which channels from the tracker file are to be played. Channel numbering starts at 1.', function(listString) {
		return listString.split(",").map(function(num){
			return parseInt(num)
		});
	})
	.option('-s, --start-position <orderNum>', 'How many patterns after the beginning of the song should the player start at.', parseInt)
	.option('-S, --stop-after <nPatterns>', 'How many patterns should be played before stopping.', parseInt)
	.option('-i, --instrument <instrument=high:low|instrument=pulseDuration>', 'What square wave duty cycle should an instrument be mapped to or the duration of the pulse in microseconds. Instrument numbering starts at 1.', function(instrStr, instrDict) {
		var [instrKey, instrRatio] = instrStr.split("=");
		if(!instrKey || !instrRatio) throw new Error("Bad instrument option '" + instrStr + "'")
		
		var [highNum, lowNum] = instrRatio.split(":");
		if(lowNum === undefined) {
			instrDict[instrKey] = {pulse : parseInt(highNum)}
		} else {
			instrDict[instrKey] = {highNum: parseInt(highNum), lowNum: parseInt(lowNum)}
		}
		
		return instrDict;
	}, {})
	.option('-O, --octave-offset <offset>', 'Shift all the notes up or down by n octaves. This is useful if you want to avoid notes like A440 (A4), which sounds expecially nasty on the Steam controller for some reason.', parseInt)
	
try {
	program.parse(process.argv);
} catch(e) {
	console.error(e.message);
	program.outputHelp();
	return 1;
}
	
if (program.args.length === 0) {
	program.outputHelp();
	return 1;
}

var filePath = program.args[0];

var readFile = Promise.promisify(require('fs').readFile);

var playerPromise = readFile(filePath).then(function(data) {
	return new OpenMTP_Module(data);
}).then(function(module){
	var sequence = new SteamControllerSequence();
	var sequenceCounter = 0;
	
	var channelMap = program.channels || [1,2]; // TODO : Generate 1..n+1 for n channels

	var tempo = module.current_tempo;
	var speed = module.current_speed;
	var channelState = {/* Per channel : {note:0, tmpEffect:false, subnoteOffset:0} */}
	var effectMemory = {/* Per channel : {[effect]:parameter} */}
	
	var orderStart = program.startPosition || 0;
	var orderStop = (program.stopAfter)?(orderStart + program.stopAfter):module.num_orders;
	
	for(var order = orderStart; order < orderStop; order++) {
		console.log("Parsing file (pattern " + (order + 1) + "/" + module.num_orders + ")");
		const pattern = module.get_order_pattern(order);
		var breakPattern = false;
		
		for(var row = 0; row < module.get_pattern_num_rows(pattern); row++) {
			for(var channel = 1; channel <= module.num_channels; channel++) {
				const update = module.get_pattern_row_channel(pattern, row, channel-1)
				// Look for song effects like speed changes even on channels that aren't played
				if(update.effect == 14) { // Break pattern
					breakPattern = true;
				}
				
				var mapIndex = channelMap.indexOf(channel);
				if (mapIndex === -1) continue;
				
				var state = channelState[mapIndex] || {};
				var memory = effectMemory[mapIndex] || {};
				
				var routine = updateToRoutine(update, state, memory);
				if(routine) sequence.add(sequenceCounter, mapIndex, routine);
				
				channelState[mapIndex] = state; // Update to routine affects the state
				effectMemory[mapIndex] = memory; // And the effect memory
			}
			
			sequenceCounter++;
			if (breakPattern) break;
		}
	}

	SteamControllerPlayer.startRegistering();
	
	// Using clasic tempo mode, see OpenMPT wiki
	// https://wiki.openmpt.org/Manual:_Song_Properties#Tempo_Mode
	return SteamControllerPlayer.playSequence(sequence, tempo, 24/speed, speed);
}).finally(function(){
	SteamControllerPlayer.stopRegistering();
	return SteamControllerPlayer.mute();
})

process.on('SIGINT', function() {
	playerPromise.cancel();
})

function getInstrument(instrumentId) {
	if (!program.instrument || !program.instrument[instrumentId]) {
		return {highNum: 1, lowNum: 1};
	}
	return program.instrument[instrumentId];
}

function updateToRoutine(update, state, memory) {
	// moduleUpdate, channelState and channelMemory
	const noteOffset = 12 * (program.octaveOffset || 0);
	var note = update.note || state.note;
	var noteReset = !!update.note;
	var newRoutine;
	var instrument = getInstrument(update.instrument);
	
	if (update.note === -1){
		state.tmpEffect = false;
		newRoutine = new StopRoutine();
	} else if (instrument.pulse) {
		state.tmpEffect = false;
		newRoutine = new Pulse(instrument.pulse);
	} else {
		switch(update.effect) {
			case 1: // Arpeggio
				var arp1 = update.parameter >> 4;
				var arp2 = update.parameter & 0x0F;
				
				newRoutine = new ArpeggioNote(note + noteOffset, arp1, arp2, instrument.highNum, instrument.lowNum);
				state.subnoteOffset = 0;
				state.tmpEffect = true;
				break;
			case 2: // Portamento up
			case 3: // Portamento down
				if (noteReset) state.subnoteOffset = 0;
				var slideStep = update.parameter || memory[update.effect]; // TODO : Up and down should share the same memory
				if (update.effect === 3) slideStep = -slideStep;
				
				newRoutine = new PortamentoNote(note + noteOffset, slideStep, 3, state, instrument.highNum, instrument.lowNum);
				// State.subnoteOffset is modified by this.
				state.tmpEffect = false;
				if (update.parameter !== 0) memory[update.effect] = update.parameter;
				
				break;
			case 5: // Vibrato
				if(!memory[update.effect]) memory[update.effect] = {};
				if (noteReset) state.subnoteOffset = 0;
				var parameter = (update.parameter < 0)?(Math.abs(update.parameter) + 0x80):update.parameter; // TODO : Fix this in node-libopenmpt
				
				var vibratoSpeed = parameter >> 4 || memory[update.effect].speed;
				var vibratoAmplitude = parameter & 0x0F || memory[update.effect].amplitude;
				
				// Leave the previous vibrato running if nothing has changed
				if (state.note !== note || vibratoSpeed !== memory[update.effect].speed || vibratoAmplitude !== memory[update.effect].amplitude) {
					newRoutine = new VibratoNote(note + noteOffset, vibratoSpeed, vibratoAmplitude, state, instrument.highNum, instrument.lowNum);
				}
				
				state.tmpEffect = true;
				if(vibratoSpeed) memory[update.effect].speed = vibratoSpeed;
				if(vibratoAmplitude) memory[update.effect].amplitude = vibratoAmplitude;
				
				break;
			default: // Unsupported effect, aliased to 0
			case 0: // No effect
				if (update.note !== 0 || state.tmpEffect) {
					// Actual new flat note change (case 0 + update.note)
					// OR Effect is temporary and has not been reinstated (case 0 + state.tmpEffect)
					newRoutine = new FlatNote(note + noteOffset, instrument.highNum, instrument.lowNum);
					state.subnoteOffset = 0;
					state.tmpEffect = false;
				}
				// 0 with no effect means it's just a noOp
				break;
		}
	}
	
	state.note = note;
	return newRoutine;
}

function logUpdate(update){
	console.log(update.string + " : [" + update.note + "," +
		update.instrument + "," + update.volume + "," +
		update.effect + "," + update.parameter + "]");
}
