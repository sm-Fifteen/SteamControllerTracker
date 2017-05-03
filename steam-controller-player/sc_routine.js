var {FeedbackPacket} = require('./sc_packets.js');
var _ = require("lodash");

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

class CyclicPattern extends ChannelRoutine {
	constructor(packets) {
		super();
		this.packets = packets;
	}

	nextTickFn() {
		var idx = this.ticksSinceStart % this.packets.length;
		this.ticksSinceStart++;
		return this.packets[idx];
	}
}

module.exports.ChannelRoutine = ChannelRoutine;
module.exports.StopRoutine = StopRoutine;
module.exports.RawFeedback = RawFeedback;
module.exports.ConstantFrequency = ConstantFrequency;
module.exports.CyclicPattern = CyclicPattern;
module.exports.packetFromFrequency = FeedbackPacket.createFromFrequency;
