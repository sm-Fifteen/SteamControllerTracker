var player = require('./sc_control.js');
var midi = require('./sc_midi.js');
var midiFileLib = require('midifile');
var fs = require('fs');
var _ = require('lodash');

var tmpFilePathVar = './Doom Theme For SC.mid';

fs.readFile(tmpFilePathVar, function(err, data) {
    if (err) throw err;
    var midiFile = new midiFileLib(data.buffer);

    var midiEvents = midiFile.getMidiEvents();
    midiEvents = _.filter(midiEvents, function(midiEvent) {
		return midiEvent.channel < player.availableChannels();
	})
    
    midiEvents.forEach(function(midiEvent) {
		// FIXME : There's definitely a better way to do this
		setTimeout(function() {
			midi.playNote(midiEvent.channel, midiEvent.param1, 1)
		}, midiEvent.playTime)
	})
});
