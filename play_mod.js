var {SteamControllerSequence, SteamControllerPlayer} = require("steam-controller-player");
var {StopRoutine, Pulse, ArpeggioNote, FlatNote} = require("./sc_music.js");

const OpenMTP_Module = require('node-libopenmpt');
var program = require('commander');
var Promise = require("bluebird");
const fs = require('fs');

Promise.config({cancellation: true})

program
	.arguments('<trackerFile>')
	.description('Reads a tracker file (MOD/XM/IT/S3M, etc.) and ' +
			'attempts to play it on a connected Steam Controller')
	.option('-c, --channels <chan0,chan1,chan2>', 'Which channels from the tracker file are to be played', function(listString) {
		return listString.split(",").map(function(num){
			return parseInt(num)
		});
	})
	.option('-s, --start-position <orderNum>', 'How many patterns after the beginning of the song should the player start at.', parseInt)
	.option('-S, --stop-after <nPatterns>', 'How many patterns should be played before stopping.', parseInt)
	.option('-i, --instrument <instrument=high:low>', 'What square wave duty cycle should an instrument be mapped to.', function(instrStr, instrDict) {
		var [instrKey, instrRatio] = instrStr.split("=");
		if(!instrKey || !instrRatio) throw new Error("Bad instrument option '" + instrStr + "'")
		
		var [highNum, lowNum] = instrRatio.split(":");
		if(!highNum || !lowNum) throw new Error("Bad instrument option '" + instrStr + "'")
		
		instrDict[instrKey] = [parseInt(highNum), parseInt(lowNum)];
		return instrDict;
	}, {})
	.option('-p, --pulse <instrument>', 'Interpret that instrument as a pulse rather than a tone, overrides --instrument.', function(instrId, instrDict){
		instrId = parseInt(instrId);
		instrDict[instrId] = [0, 0];
		return instrDict;
	}, {})
	
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

Object.keys(program.pulse).forEach(function(instrument) {
	// Pulse instruments override regular ones
	program.instrument[instrument] = program.pulse[instrument];
})

var filePath = program.args[0];

var readFile = Promise.promisify(require('fs').readFile);

var playerPromise = readFile(filePath).then(function(data) {
	return new OpenMTP_Module(data);
}).then(function(module){
	var sequence = new SteamControllerSequence();
	var channels = SteamControllerPlayer.channels;
	var sequenceCounter = 0;
	
	var channelMap = program.channels || [0,1]; // TODO : Generate 0..n for n channels
	channelMap = channelMap.slice(0, channels.length)

	var tempo = module.current_tempo;
	var speed = module.current_speed;
	var channelState = {/* Per channel : {note:0, tmpEffect:false} */}
	var effectMemory = {/* Per channel : {[effect]:parameter} */}
	
	var orderStart = program.startPosition || 0;
	var orderStop = (program.stopAfter)?(orderStart + program.stopAfter):module.num_orders;
	
	for(var order = program.startPosition; order < orderStop; order++) {
		console.log("Parsing file (pattern " + (order + 1) + "/" + module.num_orders + ")");
		const pattern = module.get_order_pattern(order);
		
		for(var row = 0; row < module.get_pattern_num_rows(pattern); row++) {
			for(var channel = 0; channel < channelMap.length; channel++) {
				const update = module.get_pattern_row_channel(pattern, row, channelMap[channel])
				var state = channelState[channel] || {};
				
				var routine = updateToRoutine(update, state);
				if(routine) sequence.add(sequenceCounter, channel, routine);
				
				channelState[channel] = state; // Update to routine affects the state
			}
			
			sequenceCounter++;
		}
	}

	// Using clasic tempo mode, see OpenMPT wiki
	// https://wiki.openmpt.org/Manual:_Song_Properties#Tempo_Mode
	return SteamControllerPlayer.playSequence(sequence, tempo, 24/speed, speed);
}).finally(function(){
	return SteamControllerPlayer.mute();
})

process.on('SIGINT', function() {
	playerPromise.cancel();
})

function getDutyRatio(instrumentId) {
	if (!program.instrument) return [1,1];
	if (!program.instrument[instrumentId]) return [1,1];
	return program.instrument[instrumentId];
}

function updateToRoutine(update, state) {
	// moduleUpdate and channelState
	var note = update.note || state.note;
	var newRoutine;
	var [highNum, lowNum] = getDutyRatio(update.instrument);
				
	if (update.note === -1){
		state.tmpEffect = false;
		newRoutine = new StopRoutine();
	} else if (highNum == 0 || lowNum == 0) {
		state.tmpEffect = false;
		newRoutine = new Pulse(1000); // TODO : Less arbitrary value/react to note?
	} else {
		switch(update.effect) {
			case 1: // Arpeggio
				var arp1 = update.parameter >> 8;
				var arp2 = update.parameter % 16;
				
				newRoutine = new ArpeggioNote(note + 12, arp1, arp2, highNum, lowNum);
				state.tmpEffect = true;
				break;
			default: // Unsupported effect, aliased to 0
			case 0: // No effect
				if (update.note !== 0 || state.tmpEffect) {
					// Actual new flat note change (case 0 + update.note)
					// OR Effect is temporary and has not been reinstated (case 0 + state.tmpEffect)
					newRoutine = new FlatNote(note + 12, highNum, lowNum);
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
