class FeedbackPacket {
	constructor(highPulseMicroSec, lowPulseMicroSec, repeatCount) {
		this.highPulseMicroSec = highPulseMicroSec;
		this.lowPulseMicroSec = lowPulseMicroSec;
		this.repeatCount = repeatCount;
	}

	static createFromFrequency(frequency, duration, hiRate = 1, loRate = 1) {
		var repeatCount = (duration >= 0.0) ? (duration * frequency) : 0x7FFF;
		var [highPulse, lowPulse] = FeedbackPacket.getPulseValues(frequency, hiRate, loRate);

		return new FeedbackPacket(highPulse, lowPulse, repeatCount);
	}

	// Channel and priority are only decided here
	generateBlob(haptic, priority) {
		var buffer = Buffer.alloc(64);

		var offset = 0;

		offset = buffer.writeUInt8(0x8f, offset) // Feedback data packet
		offset = buffer.writeUInt8(0x08, offset) // Length = 7 bytes
		offset = buffer.writeUInt8(haptic % 2, offset) // 0x01 = left, 0x00 = right
		offset = buffer.writeUInt16LE(this.highPulseMicroSec, offset)
		offset = buffer.writeUInt16LE(this.lowPulseMicroSec, offset)
		offset = buffer.writeUInt16LE(this.repeatCount, offset)
		offset = buffer.writeUInt8(priority, offset)

		return buffer;
	}

	static getPulseValues(frequency, hiRate = 1, loRate = 1) {
		var SCPeriodRatio = 2 * 495483; // Value from the SC signer
		//var SCPeriodRatio = 1000000; // 1 million microseconds

		var hiPulseNum = hiRate * SCPeriodRatio;
		var loPulseNum = loRate * SCPeriodRatio;
		var dutyCycleDenum = frequency * (hiRate + loRate);

		var highPulse = hiPulseNum/dutyCycleDenum;
		var lowPulse = loPulseNum/dutyCycleDenum;

		return [highPulse, lowPulse]
	}
}

class LedConfigPacket {
	constructor(brightness, nFlags = 0x0) {
		this.brightness = brightness;
	}

	generateBlob() {
		var buffer = Buffer.alloc(64);

		var offset = 0;

		offset = buffer.writeUInt8(0x87, offset) // Config data packet
		offset = buffer.writeUInt8(0x03, offset) // Length = 3 bytes
		offset = buffer.writeUInt8(0x2d, offset) // Config LED
		offset = buffer.writeUInt8(this.brightness, offset)
		offset = buffer.writeUInt8(nFlags, offset) // "nFlags", referred to as such in the Steam SDK

		return buffer;
	}
}

class BuiltinSoundPacket {
	constructor(soundId) {
		this.soundId = soundId;
	}

	generateBlob() {
		var buffer = Buffer.alloc(64);

		var offset = 0;

		offset = buffer.writeUInt8(0xb6, offset) // Play built-in sound
		offset = buffer.writeUInt8(0x04, offset) // Length = 4 bytes
		offset = buffer.writeUInt8(this.soundId, offset)

		return buffer;
	}
}

module.exports.FeedbackPacket = FeedbackPacket;
module.exports.LedConfigPacket = LedConfigPacket;
module.exports.BuiltinSoundPacket = BuiltinSoundPacket;
