var {Routines, SteamControllerSequence, SteamControllerPlayer} = require("steam-controller-player");
var {ArpeggioNote, FlatNote} = require("./sc_music.js");
var StopRoutine = Routines.StopRoutine;

const OpenMTP_Module = require('node-libopenmpt');
var Promise = require("bluebird");
const fs = require('fs');

var readFile = Promise.promisify(require('fs').readFile);

var tmpFilePathVar = 'alf2_zalza_edit.xm';

readFile(tmpFilePathVar).then(function(data) {
    return new OpenMTP_Module(data);
}).then(function(module){
	var sequence = new SteamControllerSequence();	
	var channels = SteamControllerPlayer.channels;
	var maxChannels = Math.max(module.num_channels, channels.length)
	var sequenceCounter = 0;
	
	var tempo = module.current_tempo;
	var speed = module.current_speed;
	
	for(var order = module.current_order; order < module.num_orders; order++) {
		const pattern = module.get_order_pattern(order);
		for(var row = 0; row < module.get_pattern_num_rows(pattern); row++) {
			module.set_position_order_row(order, row);
			
			for(var channel = 0; channel < maxChannels; channel++) {
				const update = module.get_pattern_row_channel(pattern, row, channel)
				sequence.add(sequenceCounter, channels[channel], new FlatNote(update.note));
			}
			sequenceCounter++;
		}
	}
	
	// Using clasic tempo mode, see OpenMPT wiki
	// https://wiki.openmpt.org/Manual:_Song_Properties#Tempo_Mode
	return SteamControllerPlayer.playSequence(sequence, tempo, 24/speed, speed);
})
