class ChannelRoutine {
	function run(channel) {
		return Promise.reject("Method run unimplemented for routine");
	}
}

class RawFeedback extends ChannelRoutine {
	var feedbackData;
	
	constructor(highDuration, lowDuration, repeatCount) {
		this.feedbackData = {
			highDuration: highDuration,
			lowDuration: lowDuration,
			repeatCount: repeatCount,
		}
	}
	
	constructor(feedbackData) {
		this.feedbackData = feedbackData;
	}
	
	function run(channel) {
		return channel.send(feedbackData)
	}
}

// Also add "SimpleTone", which only takes high and low duration and a tone duration
// Using routines, complex patterns can "keep happening" until we stop.

// How to make concurrency go away for all the channels here?
