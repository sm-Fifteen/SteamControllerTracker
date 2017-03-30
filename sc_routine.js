var FeedbackPacket = require('./sc_packets.js').FeedbackPacket;

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
		if(this.ticksSinceStart === 0) {
			return this.feedbackPacket;
		}
	}
}

class ConstantFrequency extends ChannelRoutine {
	constructor(frequency, hiRate = 1, loRate = 1) {
		super();
		this.feedbackPacket = FeedbackPacket.createFromFrequency(frequency, -1, hiRate, loRate);
	}

	nextTickFn() {
		if(this.ticksSinceStart === 0) {
			return this.feedbackPacket;
		}
	}
}

module.exports.ChannelRoutine = ChannelRoutine;
module.exports.RawFeedback = RawFeedback;
module.exports.ConstantFrequency = ConstantFrequency;

// Also add "SimpleTone", which only takes high and low duration and a tone duration
// Using routines, complex patterns can "keep happening" until we stop.

// How to make concurrency go away for all the channels here?
