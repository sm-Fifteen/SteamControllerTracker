// Most of the code found here is a reproduction of Pilatomic's Steam Controller Singer
// https://gitlab.com/Pilatomic/SteamControllerSinger
// https://github.com/kozec/sc-controller

// Also : https://github.com/alxgnon-archive/launchpad-app
// https://github.com/justinlatimer/node-midi
// https://github.com/tessel/node-usb

var usb = require('usb');

var singleton = function() {
	var devices = [];
	
	function init() {
		var device = usb.findByIds(0x28de, 0x1102);
		device.open();
		var iface = device.interface(2); // Interface 0 is keyboard, 1 is mouse, 2 is "Valve"

		if (iface.isKernelDriverActive()) {
			iface.detachKernelDriver();
		}

		iface.claim();
		devices.push(device);
	}

	function availableChannels() {
		//Presuming we've got exactly 2 channels per device
		return 2 * devices.length;
	}

	function sendBlob(device, dataBlob, callback) {
		device.controlTransfer( 
			usb.LIBUSB_REQUEST_TYPE_CLASS + usb.LIBUSB_RECIPIENT_INTERFACE, // To class interface
			usb.LIBUSB_REQUEST_SET_CONFIGURATION,
			0x0300, // HID Report type & ID?
			2, // Interface number
			dataBlob,
			callback
		)
	}

	function playFrequency(channel, frequency, duration, hiRate = 1, loRate = 1) {
		var repeatCount = (duration >= 0.0) ? (duration * frequency) : 0x7FFF;
		var [highPulse, lowPulse] = getPulseValues(frequency, hiRate, loRate);
		
		if(channel >= availableChannels()) return; // FIXME: Silently drop for now
		
		var device = devices[channel>>1]; //Presuming we've got exactly 2 channels per device
		var haptic = channel%2;
		
		var dataBlob = generateFeedbackPacket(haptic, highPulse, lowPulse, repeatCount);
		
		sendBlob(device, dataBlob);
	}
	
	// Channel refers to whatever controller has this channel registered,
	// but it makes no difference which of the two channels you pick. 
	function setLedBrightness(channel, percentage) {
		if(channel >= availableChannels()) return; // FIXME: Silently drop for now
		var device = devices[channel>>1]; //Presuming we've got exactly 2 channels per device
		
		var dataBlob = generateLedConfigPacket(percentage);
		sendBlob(device, dataBlob);
	}
	
	function playBuiltinSound(channel, soundId) {
		if(channel >= availableChannels()) return; // FIXME: Silently drop for now
		var device = devices[channel>>1]; //Presuming we've got exactly 2 channels per device
		
		var dataBlob = generatePlayBuiltinSoundPacket(soundId);
		console.log(dataBlob)
		sendBlob(device, dataBlob);
	}
	
	function sendRawBytes(channel, rawBytes) {
		if(channel >= availableChannels()) return;
		var device = devices[channel>>1];
		
		var dataBlob = generateRawBytesPacket(rawBytes);
		sendBlob(device, dataBlob);
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
	
	init()
	
	return {
		playFrequency: playFrequency,
		availableChannels: availableChannels,
		setLedBrightness: setLedBrightness,
		playBuiltinSound: playBuiltinSound,
		sendRawBytes: sendRawBytes,
	}
}()

Object.defineProperty(module, "exports", {
	get: function() {
		return singleton;
	}
});

// LIBUSB_ERROR_ACCESS : Can't access the device as $USER
// LIBUSB_ERROR_BUSY : Something else is already using the device, probably Steam.
