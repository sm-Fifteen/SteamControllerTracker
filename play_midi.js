/**
 * An experiment to see if I could get midis to run properly in a tracker-style
 * structure like that. Turns out MIDI does its timing in a mostly arbitrary way,
 * so I'd have to bypass the sc_player interface to get that wor work correctly.
*/

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
	var speed = midiFile.header.getTicksPerBeat(); // How many ticks in a *quarter*-note
	var sequence = new SteamControllerSequence();
	var channels = SteamControllerPlayer.channels;

	// Delta-timing works on a per-track basis
	midiFile.tracks.forEach(function(midiTrack){
		var midiEvents = MIDIEvents.createParser(midiTrack.getTrackContent(), 0);
		var position = 0;
		var channelNote = new Array(channels.length);

		var midiEvent;
		while (midiEvent = midiEvents.next()) {
			if(midiEvent.type === MIDIEvents.EVENT_META && midiEvent.subtype === MIDIEvents.EVENT_META_SET_TEMPO) {
				sequence.setTime(position, (midiEvent.tempo/250000) * speed); // tempo is in µs par quarter-note
			} else if (midiEvent.type === MIDIEvents.EVENT_MIDI &&
					midiEvent.channel >= 0 && midiEvent.channel < channels.length) {
				if (midiEvent.subtype === MIDIEvents.EVENT_MIDI_NOTE_OFF) {
					// Ignore for now
					//sequence.add(position, channels[midiEvent.channel], new StopRoutine());
				} else if (midiEvent.subtype === MIDIEvents.EVENT_MIDI_NOTE_ON) {
					channelNote[midiEvent.channel] = midiEvent.param1;
					sequence.add(position, channels[midiEvent.channel], new FlatNote(midiEvent.param1));
				}
			}
			position += midiEvent.delta/4;
		}
	}, this)

	//console.log(sequence)
	return SteamControllerPlayer.playSequence(sequence, 120, 4, 1);
})
