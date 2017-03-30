var midi = require('./sc_midi.js')
var dtmf = require('./sc_dtmf.js')
var control = require('./sc_control.js')
var {ChannelRoutine, RawFeedback, ConstantFrequency} = require("./sc_routine.js");

// From C-1 to B-8, the 95 XM notes
//midi.playRange(1, 24, 119, 1, 1, 7)
// B-6 max, I've heard enough teen buzz for a lifetime.
//for(var i = 24; i <= 95; i++) {
//midi.playRange(1, 72, 95, 1, 1, 7)
//The controller only seems to resonate on frequencies close to A depending on the duty cycle
//midi.playRange(1, 33, 69, 1, 1, 7, 12)

/*
// Play A440
midi.playNote(1, 69, 3)
*/

/*
// Send a 100us pulse wave with a 1000us period 5000 times, for a total of exactly 5 seconds.
sendBlob(generatePacket(1, 100, 900, 5000))
setTimeout(function(){}, 5000);
*/

/*
dtmf.playDialTone(0,1, 3)
setTimeout(function(){
	//https://en.wikipedia.org/wiki/File:Dial_up_modem_noises.ogg
	dtmf.playDTMFSequence(0, 1, [1,5,7,0,2,3,4,0,0,0,3], 0.12, 0.08);
}, 3000)
*/

//control.setLedBrightness(1, 100);

// Sounds won't play unless you send this first
//control.sendRawBytes(0, [0xc1, 0x10, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f])
//control.playBuiltinSound(0, 0x00);

var device = control.devices[0];

device.channels[0].routine = new RawFeedback(33333,22222,34464);
device.nextTick(200).then(function(){
	device.channels[0].routine = new ConstantFrequency(50);
	return device.nextTick(200);
}).then(function(){
	device.channels[0].routine = new RawFeedback(0,0,0);
	return device.nextTick(200);
}).catch(function(e){
	device.channels[0].routine = new RawFeedback(0,0,0)
	device.channels[1].routine = new RawFeedback(0,0,0)
	device.nextTick(0);
	throw e;
})
