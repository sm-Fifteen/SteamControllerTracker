// Most of the code found here is a reproduction of Pilatomic's Steam Controller Singer
// https://gitlab.com/Pilatomic/SteamControllerSinger
// https://github.com/kozec/sc-controller

// Also : https://github.com/alxgnon-archive/launchpad-app
// https://github.com/justinlatimer/node-midi
// https://github.com/tessel/node-usb

var usb = require('usb');
var Promise = require("bluebird");
var {SteamControllerDevice} = require("./sc_device.js")

var singleton = function() {
	var devices = [];

	function init() {
		var device = usb.findByIds(0x28de, 0x1102);

		devices.push(new SteamControllerDevice(device));
	}

	init()

	return {
		devices: devices,
	}
}()

Object.defineProperty(module, "exports", {
	get: function() {
		return singleton;
	}
});

// LIBUSB_ERROR_ACCESS : Can't access the device as $USER
// LIBUSB_ERROR_BUSY : Something else is already using the device, probably Steam.
