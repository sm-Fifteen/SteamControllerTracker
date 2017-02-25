var midi = require('./sc_midi.js')
var dtmf = require('./sc_dtmf.js')

// From C-1 to B-8, the 95 XM notes
//midi.playRange(1, 24, 119, 1, 1, 7)
// B-6 max, I've heard enough teen buzz for a lifetime.
//for(var i = 24; i <= 95; i++) {
//midi.playRange(1, 24, 95, 1, 1, 7)
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

//https://en.wikipedia.org/wiki/File:Dial_up_modem_noises.ogg
dtmf.playDTMFSequence(0, 1, [1,5,7,0,2,3,4,0,0,0,3], 0.12, 0.08);

