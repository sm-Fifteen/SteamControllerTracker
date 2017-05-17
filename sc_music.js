var {Routines} = require("steam-controller-player");

// All 127 midi frequencies, taken from pilatomic's Steam Controller Signer
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

function displayNote(note) {
	const noteBaseNameArray = [" C","C#"," D","D#"," E"," F","F#"," G","G#"," A","A#"," B"];

	return 	noteBaseNameArray[note % 12] + Math.floor((note/12) -1)
}

function getFrequency(note, semitoneFraction = 0, semitoneDivision = 16) {
	if (semitoneFraction === 0) {
		return midiFrequency[note];
	} else {
		note += Math.floor(semitoneFraction / semitoneDivision);
		semitoneFraction = semitoneFraction % semitoneDivision;
		note += -6*12 + 10; // Note needs to be relative to A4, but midi starts at C-1
		
		// midC * 2^(note/12)
		return midiFrequency[62] * Math.pow(2, note/12 + semitoneFraction/(12*semitoneDivision));
	}
}

class FlatNote extends Routines.ConstantFrequency {
	constructor(midiNote, hiRate = 1, loRate = 1) {
		super(getFrequency(midiNote), hiRate, loRate)
		this.string = displayNote(midiNote);
	}
	
	toString() {
		return this.string;
	}
}

class ArpeggioNote extends Routines.CyclicPattern {
	constructor(midiNote, x, y, hiRate = 1, loRate = 1) {
		super([
			Routines.packetFromFrequency(getFrequency(midiNote), -1, hiRate, loRate),
			Routines.packetFromFrequency(getFrequency(midiNote + x), -1, hiRate, loRate),
			Routines.packetFromFrequency(getFrequency(midiNote + y), -1, hiRate, loRate),			
		]);
		this.string = displayNote(midiNote) + "," + displayNote(midiNote+x) + "," + displayNote(midiNote+y)
	}
	
	toString() {
		return this.string;
	}
}

class PortamentoNote extends Routines.SlidePattern {
	constructor(midiNote, slideSlope, speed, state, hiRate = 1, loRate = 1, semitoneDivisions = 16) {
		const packetList = [];
		
		var subnoteOffset = state.subnoteOffset || 0;
		
		// TODO : Add amiga slides (requires using period tables instead of frequency), semitoneDivisions = 0
		
		for(var i = 0; i < speed; i++) {
			subnoteOffset += slideSlope;
			packetList.push(Routines.packetFromFrequency(getFrequency(midiNote, subnoteOffset, semitoneDivisions), -1, hiRate, loRate));
		}
		
		state.subnoteOffset = subnoteOffset;
		
		super(packetList);
		this.string = displayNote(midiNote) + ((slideSlope > 0)?"//":"\\")
	}
	
	toString() {
		return this.string;
	}
}

module.exports.FlatNote = FlatNote;
module.exports.ArpeggioNote = ArpeggioNote;
module.exports.PortamentoNote = PortamentoNote;
module.exports.StopRoutine = Routines.StopRoutine;
module.exports.Pulse = Routines.Pulse;
