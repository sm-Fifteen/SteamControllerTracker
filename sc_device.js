var Promise = require("bluebird");
var {ChannelRoutine, RawFeedback} = require("./sc_routine.js");
var packetFactory = require('./sc_packets.js');
var usb = require('usb');


class SteamControllerChannel {
	constructor(scDevice, channelId) {
		this.device = scDevice;
		this.channelId = channelId;
		this.currentRoutine = new ChannelRoutine();
	}

	set routine(channelRoutine) {
		this.currentRoutine = channelRoutine;
	}

	nextTickData() {
		return this.currentRoutine.nextTickFn();
	}
}

class SteamControllerDevice {
	constructor(usbDevice) {
		this.usbDevice = usbDevice;

		usbDevice.open();
		var iface = usbDevice.interface(2); // Interface 0 is keyboard, 1 is mouse, 2 is "Valve"

		if (iface.isKernelDriverActive()) {
			iface.detachKernelDriver();
		}

		iface.claim();

		this.channels = [
			new SteamControllerChannel(this, 0),
			new SteamControllerChannel(this, 1)
		];

		this.sendControl = Promise.promisify(usbDevice.controlTransfer, {
			context: usbDevice,
		});
	}

	nextTick(tickDuration) {
		var device = this;
		return Promise.all([
			Promise.each(this.channels, function(channel) {
				var tickData = channel.nextTickData();
				console.log("Channel #" + channel.channelId + ":" + tickData)
				if(tickData) {
					return device.sendFeedback(channel, tickData);
				} else {
					return Promise.resolve();
				}
			}),
			Promise.delay(tickDuration)
		])
	}

	sendFeedback(channel, feedbackData) {
		var blobBuf = packetFactory.generateFeedbackPacket(channel.channelId,
			feedbackData.highDuration, feedbackData.lowDuration, feedbackData.repeatCount);

		return this.sendBlob(blobBuf);
	}

	sendBlob(blobBuf) {
		return this.sendControl(
			usb.LIBUSB_REQUEST_TYPE_CLASS + usb.LIBUSB_RECIPIENT_INTERFACE, // To class interface
			usb.LIBUSB_REQUEST_SET_CONFIGURATION,
			0x0300, // HID Report type & ID?
			2, // Interface number
			blobBuf
		).then(function(error) {
			if (!error) {
				return;
			} else {
				throw error;
			}
		})
	}
	// On each device tick, for each channel, run nextTickFn on the current routine
}

module.exports.SteamControllerDevice = SteamControllerDevice;
module.exports.SteamControllerChannel = SteamControllerChannel;
