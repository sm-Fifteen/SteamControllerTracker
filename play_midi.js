var {Routines, SteamControllerSequence, SteamControllerPlayer} = require("steam-controller-player");
var {ArpeggioNote, FlatNote} = require("./sc_music.js");
var StopRoutine = Routines.StopRoutine;

var Promise = require("bluebird");
var midiFileLib = require('midifile');
var MIDIEvents = require('midievents');
var _ = require('lodash');

var tmpFilePathVar = './Doom Theme For SC.mid';

var readFile = Promise.promisify(require('fs').readFile)

readFile(tmpFilePathVar).then(function(data) {
	return new midiFileLib(data.buffer);
}).then(function(midiFile){
	var midiEvents = midiFile.getMidiEvents();
	var currentTempo = 100;
	var speed = midiFile.header.getTicksPerBeat();
	// We'll just circumvent midi ticks entirely and use them as lines
	var sequence = new SteamControllerSequence();
	var channels = SteamControllerPlayer.channels;
	var position = 0;

	midiEvents.forEach(function(midiEvent){
		if(midiEvent.type === MIDIEvents.EVENT_META && midiEvent.subtype === MIDIEvents.EVENT_META_SET_TEMPO) {
			currentTempo = midiEvent.tempo;
		} else if (midiEvent.type === MIDIEvents.EVENT_MIDI) {
			if (midiEvent.subtype === MIDIEvents.EVENT_MIDI_NOTE_OFF) {
				sequence.add(position, channels[midiEvent.channel], new StopRoutine());
			} else if (midiEvent.subtype === MIDIEvents.EVENT_MIDI_NOTE_ON) {
				if (midiEvent.channel >= channels.length) return;
				sequence.add(position, channels[midiEvent.channel], new FlatNote(midiEvent.param1));
			}
		}
		position += midiEvent.delta;
	}, this)

	//console.log(sequence)
	return SteamControllerPlayer.playSequence(sequence, currentTempo, speed, 1);
})
