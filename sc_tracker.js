// Most of the code found here is a reproduction of Pilatomic's Steam Controller Singer
// https://gitlab.com/Pilatomic/SteamControllerSinger
// https://github.com/kozec/sc-controller

// Also : https://github.com/alxgnon-archive/launchpad-app
// https://github.com/justinlatimer/node-midi
// https://github.com/tessel/node-usb

var midiFrequency  = [
	8.1758,  8.66196, 9.17702, 9.72272, 10.3009, 10.9134, 11.5623, 12.2499, 12.9783, 13.75, 14.5676, 15.4339,
	16.3516, 17.3239, 18.354,  19.4454, 20.6017, 21.8268, 23.1247, 24.4997, 25.9565, 27.5,  29.1352, 30.8677,
	32.7032, 34.6478, 36.7081, 38.8909, 41.2034, 43.6535, 46.2493, 48.9994, 51.9131, 55,    58.2705, 61.7354, 
	65.4064, 69.2957, 73.4162, 77.7817, 82.4069, 87.3071, 92.4986, 97.9989, 103.826, 110,   116.541, 123.471, 
	130.813, 138.591, 146.832, 155.563, 164.814, 174.614, 184.997, 195.998, 207.652, 220,   233.082, 246.942,
	261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995, 415.305, 440,   466.164, 493.883,
	523.251, 554.365, 587.33,  622.254, 659.255, 698.456, 739.989, 783.991, 830.609, 880,   932.328, 987.767,
	1046.5,  1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760,  1864.66, 1975.53,
	2093,    2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, 3520,  3729.31, 3951.07,
	4186.01, 4434.92, 4698.64, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040,  7458.62, 7902.13,
	8372.02, 8869.84, 9397.27, 9956.06, 10548.1, 11175.3, 11839.8, 12543.9
];
var steamControllerMagicPeriodRatio = 495483.0;

var usb = require('usb');
var device = usb.findByIds(0x28de, 0x1102);
device.open();
var iface = device.interface(2); // Interface 0 is keyboard, 1 is mouse, 2 is "Valve"

if (iface.isKernelDriverActive()) {
	iface.detachKernelDriver();
}

iface.claim();

// MIDI note number [0-127], Duration (in seconds)
function playNote(device, haptic, note, duration) {
	var frequency = midiFrequency[note];
	var period = 1.0 / frequency;
	var repeatCount = (duration >= 0.0) ? (duration / period) : 0x7FFF;
	
	var dataBlob = generatePacket(haptic, period, period, repeatCount);
	
	var sendBlob = device.controlTransfer.bind(device, 
		usb.LIBUSB_REQUEST_TYPE_CLASS + usb.LIBUSB_RECIPIENT_INTERFACE, // To class interface
		usb.LIBUSB_REQUEST_SET_CONFIGURATION,
		0x0300, // HID Report type & ID?
		iface.interfaceNumber
	)

	sendBlob(dataBlob);
}


//channel.playNote

function generatePacket(haptic, hiPulseDuration, loPulseDuration, repeatCount) {
	var buffer = Buffer.alloc(64);
	
	hiPulseDuration *= steamControllerMagicPeriodRatio;
	loPulseDuration *= steamControllerMagicPeriodRatio;
	
	var offset = 0;

	offset = buffer.writeUInt8(0x8f, offset) // Feedback data packet
	offset = buffer.writeUInt8(0x07, offset) // Length = 7 bytes
	offset = buffer.writeUInt8(haptic % 2, offset) // 0x01 = left, 0x00 = right
	offset = buffer.writeInt16LE(hiPulseDuration, offset)
	offset = buffer.writeInt16LE(loPulseDuration, offset)
	offset = buffer.writeInt16LE(repeatCount, offset)
	
	return buffer;
}

playNote(device, 1, 50, 3)

// LIBUSB_ERROR_ACCESS : Can't access the device as $USER
// LIBUSB_ERROR_BUSY : Something else is already using the device, probably Steam.
