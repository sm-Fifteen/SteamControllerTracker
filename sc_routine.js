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
		this.feedbackData = {
			highDuration: highDuration,
			lowDuration: lowDuration,
			repeatCount: repeatCount,
		};
	}

	nextTickFn() {
		if(this.ticksSinceStart === 0) {
			return this.feedbackData;
		}
	}
}

module.exports.ChannelRoutine = ChannelRoutine;
module.exports.RawFeedback = RawFeedback;

// Also add "SimpleTone", which only takes high and low duration and a tone duration
// Using routines, complex patterns can "keep happening" until we stop.

// How to make concurrency go away for all the channels here?
