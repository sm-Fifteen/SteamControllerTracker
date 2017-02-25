var player = require('./sc_control.js')

function playDTMF(channel1, channel2, number, duration) {
	console.log(number)
	var freq1 = 0;
	var freq2 = 0;
	
	switch (number) {
		case 1:
		case 2:
		case 3:
		case 'A':
			freq1 = 697;
			break;
		case 4:
		case 5:
		case 6:
		case 'B':
			freq1 = 770;
			break;
		case 7:
		case 8:
		case 9:
		case 'C':
			freq1 = 852;
			break;
		case '*':
		case 0:
		case '#':
		case 'D':
			freq1 = 941;
			break;
	}
	
	switch (number) {
		case 1:
		case 4:
		case 7:
		case '*':
			freq2 = 1209;
			break;
		case 2:
		case 5:
		case 8:
		case 0:
			freq2 = 1336;
			break;
		case 3:
		case 6:
		case 9:
		case '#':
			freq2 = 1477;
			break;
		case 'A':
		case 'B':
		case 'C':
		case 'D':
			freq2 = 1633;
			break;
	}
	
	if(freq1 && freq2) {
		player.playFrequency(channel1, freq1, duration);
		player.playFrequency(channel2, freq2, duration);
	}
}

function playDTMFSequence(channel1, channel2, numberList, duration, spacing = 0) {
	playDTMF(channel1, channel2, numberList.shift(), duration);
	if (numberList.length == 0) return;

	setTimeout(function(){
		playDTMFSequence(channel1, channel2, numberList, duration, spacing);
	}, duration * 1000 + spacing * 1000);
}

/*
 * http://www.microchip.com/forums/FindPost/403949
 * "If a square wave was used for dial tone then a DTMF dial digit could
 * not be detected because the DTMF decoder would be overloaded by the
 * harmonics of the 440Hz square wave."
 */

function playDialTone(channel1, channel2, duration) {
	// FIXME : Doesn't sound quite right, not having sine waves doesn't help.
	player.playFrequency(channel1, 350, duration, 1, 1);
	// Don't use a 1:1 duty cycle on A440 unless you want tinnitus
	player.playFrequency(channel2, 440, duration, 1, 4);
}

module.exports = {
	playDTMF: playDTMF,
	playDTMFSequence: playDTMFSequence,
	playDialTone: playDialTone,
}
