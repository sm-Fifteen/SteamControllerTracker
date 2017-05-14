var {SteamControllerSequence, SteamControllerPlayer} = require("steam-controller-player");
var {StopRoutine, ArpeggioNote, FlatNote} = require("./sc_music.js");

const OpenMTP_Module = require('node-libopenmpt');
var program = require('commander');
var Promise = require("bluebird");
const fs = require('fs');

Promise.config({cancellation: true})

program
	.arguments('<trackerFile>')
	.description('Reads a tracker file (MOD/XM/IT/S3M, etc.) and ' +
			'attempts to play it on a connected Steam Controller')
	
program.parse(process.argv);
	
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
	var channels = SteamControllerPlayer.channels;
	var maxChannels = Math.max(module.num_channels, channels.length)
	var sequenceCounter = 0;

	var tempo = module.current_tempo;
	var speed = module.current_speed;
	var channelState = {/* Per channel : {note:0, tmpEffect:false} */}
	var effectMemory = {/* Per channel : {[effect]:parameter} */}

	for(var order = module.current_order; order < module.num_orders; order++) {
		const pattern = module.get_order_pattern(order);
		for(var row = 0; row < module.get_pattern_num_rows(pattern); row++) {
			module.set_position_order_row(order, row);

			for(var channel = 0; channel < maxChannels; channel++) {
				const update = module.get_pattern_row_channel(pattern, row, channel)
				var state = channelState[channel] || {};
				var note = update.note || state.note;
			
				switch(update.effect) {
					case 1: // Arpeggio
						var arp1 = update.parameter >> 8;
						var arp2 = update.parameter % 16;
						sequence.add(sequenceCounter, channels[channel], new ArpeggioNote(note + 12, arp1, arp2));
						
						state.tmpEffect = true;
						break;
					default: // Unsupported effect, aliased to 0
					case 0: // No effect
						if (update.note === -1){
							sequence.add(sequenceCounter, channels[channel], new StopRoutine());
							
							state.tmpEffect = false;
						} else if (update.note !== 0 || state.tmpEffect) {
							// Actual new flat note change (case 0 + update.note)
							// OR Effect is temporary and has not been reinstated (case 0 + state.tmpEffect)
							sequence.add(sequenceCounter, channels[channel], new FlatNote(note + 12));
							
							state.tmpEffect = false;
						}
						// 0 with no effect means it's just a noOp
						break;
				}
				state.note = note;
				channelState[channel] = state;
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

function logUpdate(update){
	console.log(update.string + " : [" + update.note + "," +
		update.instrument + "," + update.volume + "," +
		update.effect + "," + update.parameter + "]");
}
