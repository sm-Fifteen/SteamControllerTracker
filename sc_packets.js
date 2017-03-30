function playFrequency(channel, frequency, duration, hiRate = 1, loRate = 1, nFlags = 0x0) {
	var repeatCount = (duration >= 0.0) ? (duration * frequency) : 0x7FFF;
	var [highPulse, lowPulse] = getPulseValues(frequency, hiRate, loRate);

	if(channel >= availableChannels()) return; // FIXME: Silently drop for now

	var device = devices[channel>>1]; //Presuming we've got exactly 2 channels per device
	var haptic = channel%2;

	var dataBlob = generateFeedbackPacket(haptic, highPulse, lowPulse, repeatCount, nFlags);

	return sendBlob(device, dataBlob);
}

function playPulse(channel, usDuration, nFlags = 0x0) {
	if(channel >= availableChannels()) return; // FIXME: Silently drop for now

	var device = devices[channel>>1]; //Presuming we've got exactly 2 channels per device
	var haptic = channel%2;

	var dataBlob = generateFeedbackPacket(haptic, usDuration, 0, 1, nFlags);


	return sendBlob(device, dataBlob);
}

// Channel refers to whatever controller has this channel registered,
// but it makes no difference which of the two channels you pick.
function setLedBrightness(channel, percentage) {
	if(channel >= availableChannels()) return; // FIXME: Silently drop for now
	var device = devices[channel>>1]; //Presuming we've got exactly 2 channels per device

	var dataBlob = generateLedConfigPacket(percentage);
	return sendBlob(device, dataBlob);
}

function playBuiltinSound(channel, soundId) {
	if(channel >= availableChannels()) return; // FIXME: Silently drop for now
	var device = devices[channel>>1]; //Presuming we've got exactly 2 channels per device

	var dataBlob = generatePlayBuiltinSoundPacket(soundId);
	console.log(dataBlob)
	return sendBlob(device, dataBlob);
}

function sendRawBytes(channel, rawBytes) {
	if(channel >= availableChannels()) return;
	var device = devices[channel>>1];

	var dataBlob = generateRawBytesPacket(rawBytes);
	return sendBlob(device, dataBlob);
}

function getPulseValues(frequency, hiRate = 1, loRate = 1) {
	var SCPeriodRatio = 2 * 495483; // Value from the SC signer
	//var SCPeriodRatio = 1000000; // 1 million microseconds

	var hiPulseNum = hiRate * SCPeriodRatio;
	var loPulseNum = loRate * SCPeriodRatio;
	var dutyCycleDenum = frequency * (hiRate + loRate);

	var highPulse = hiPulseNum/dutyCycleDenum;
	var lowPulse = loPulseNum/dutyCycleDenum;

	return [highPulse, lowPulse]
}

function generateFeedbackPacket(haptic, highPulseMicroSec, lowPulseMicroSec, repeatCount, nFlags = 0b0) {
	var buffer = Buffer.alloc(64);

	var offset = 0;

	offset = buffer.writeUInt8(0x8f, offset) // Feedback data packet
	offset = buffer.writeUInt8(0x08, offset) // Length = 7 bytes
	offset = buffer.writeUInt8(haptic % 2, offset) // 0x01 = left, 0x00 = right
	offset = buffer.writeUInt16LE(highPulseMicroSec, offset)
	offset = buffer.writeUInt16LE(lowPulseMicroSec, offset)
	offset = buffer.writeUInt16LE(repeatCount, offset)
	offset = buffer.writeUInt8(nFlags, offset) // "nFlags", supposedly unused

	return buffer;
}

function generateLedConfigPacket(brightnessPercentage, nFlags = 0b0) {
	var buffer = Buffer.alloc(64);

	var offset = 0;

	offset = buffer.writeUInt8(0x87, offset) // Config data packet
	offset = buffer.writeUInt8(0x03, offset) // Length = 3 bytes
	offset = buffer.writeUInt8(0x2d, offset) // Config LED
	offset = buffer.writeUInt8(nFlags, offset) // "nFlags", referred to as such in the Steam SDK
	offset = buffer.writeUInt8(brightnessPercentage, offset)

	return buffer;
}

function generatePlayBuiltinSoundPacket(effectId) {
	var buffer = Buffer.alloc(64);

	var offset = 0;

	offset = buffer.writeUInt8(0xb6, offset) // Play built-in sound
	offset = buffer.writeUInt8(0x04, offset) // Length = 4 bytes
	offset = buffer.writeUInt8(effectId, offset)

	return buffer;
}

function generateRawBytesPacket(byteArray) {
	var buffer = Buffer.alloc(64);
	var offset = 0;

	byteArray.forEach(function(byte) {
		offset = buffer.writeUInt8(byte, offset)
	})

	return buffer;
}

module.exports = {
	playFrequency: playFrequency,
	setLedBrightness: setLedBrightness,
	playBuiltinSound: playBuiltinSound,
	sendRawBytes: sendRawBytes,
	playPulse: playPulse,
	generateFeedbackPacket: generateFeedbackPacket,
}
