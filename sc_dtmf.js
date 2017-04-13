var {Routines} = require("steam-controller-player");

function getDTMF(number) {
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

	return [freq1, freq2];
}

function getDialTone() {
	// TODO : Change this for a routine factory?
	return [350, 440]
}

module.exports = {
	getDTMF: getDTMF,
	getDialTone: playDialTone,
}
