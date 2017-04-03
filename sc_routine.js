var {FeedbackPacket} = require('./sc_packets.js');
var music = require('./sc_music.js')

/**
 * Routines are just abstractions of something the channel can keep doing until
 * we tell it to do something else.
 */

class ChannelRoutine {
	constructor() {
		this.ticksSinceStart = 0;
	}

	nextTickFn() {
		return;
	}
}

class RawFeedback extends ChannelRoutine {
	constructor(highDuration, lowDuration, repeatCount) {
		super();
		this.feedbackPacket = new FeedbackPacket(highDuration, lowDuration, repeatCount);
	}

	nextTickFn() {
		if(this.ticksSinceStart++ === 0) {
			return this.feedbackPacket;
		}
	}
}

class StopRoutine extends RawFeedback{
	constructor() {
		super(0,0,0);
	}
}

class ConstantFrequency extends ChannelRoutine {
	constructor(frequency, hiRate = 1, loRate = 1) {
		super();
		this.feedbackPacket = FeedbackPacket.createFromFrequency(frequency, -1, hiRate, loRate);
	}

	nextTickFn() {
		if(this.ticksSinceStart++ === 0) {
			return this.feedbackPacket;
		}
	}
}

class FlatNote extends ConstantFrequency {
	constructor(midiNote, hiRate = 1, loRate = 1) {
		super(music.getMidiFreqency(midiNote), hiRate, loRate)
	}
}

class ArpeggioNote extends ChannelRoutine {
	constructor(midiNote, x, y, hiRate = 1, loRate = 1) {
		super();
		this.notePackets = [
			FeedbackPacket.createFromFrequency(music.getMidiFreqency(midiNote), hiRate, loRate),
			FeedbackPacket.createFromFrequency(music.getMidiFreqency(midiNote + x), hiRate, loRate),
			FeedbackPacket.createFromFrequency(music.getMidiFreqency(midiNote + y), hiRate, loRate),
		];
	}

	nextTickFn() {
		var idx = this.ticksSinceStart % 3;
		this.ticksSinceStart++;
		return this.notePackets[idx];
	}
}

module.exports.ChannelRoutine = ChannelRoutine;
module.exports.StopRoutine = StopRoutine;
module.exports.RawFeedback = RawFeedback;
module.exports.ConstantFrequency = ConstantFrequency;
module.exports.FlatNote = FlatNote;
module.exports.ArpeggioNote = ArpeggioNote;
