var Promise = require("bluebird");
var usb = require('usb');
var {SteamControllerDevice, SteamControllerChannel} = require("./sc_device.js")
var Routines = require("./sc_routine.js")
var _ = require("lodash")

class SteamControllerPlayer {
	constructor() {
		this.devices = [];

		// TODO : Multiple devices
		var device = usb.findByIds(0x28de, 0x1102);

		this.devices.push(new SteamControllerDevice(device));
	}

	get channels() {
		// FIXME
		return this.devices[0].channels;
	}

	playSequence(sequence, beatsPerMinute, linesPerBeat, ticksPerLine) {
		var sequencePlayer = startSequence(sequence, this.devices, beatsPerMinute, linesPerBeat, ticksPerLine)
		var sc_player = this;
		
		function chainHandle(result) {
			// Based on this : https://www.promisejs.org/generators/
			var valuePromise = Promise.resolve(result.value);

			if(result.done) return valuePromise;
	
			return valuePromise.then(function(result) {
				return chainHandle(sequencePlayer.next());
			})
		}
		
		function* startSequence(sequence, devices, beatsPerMinute, linesPerBeat, ticksPerLine) {
			// A generator that reads the sequence and outputs promises when it needs to wait for IO.
			const timer = new SequenceTimer(beatsPerMinute, linesPerBeat, ticksPerLine);
			
			while(timer.line < sequence.lastLine + 1 ) {
				if(timer.tick === 0) {
					var updates = sequence.atLine(timer.line);
					
					// Set the channel pointed by a routine to play that routine.
					updates.channelUpdates.forEach(function(channelUpdate){
						channelUpdate.channel.routine = channelUpdate.routine;
					})
					
					if (updates.timerUpdate) timer.timing = updates.timerUpdate;
				}
		
				// TODO : Extra devices
				yield sc_player.nextTick(timer.tickDuration)
				timer.tick++
			}
		}
		
		return chainHandle(sequencePlayer.next());
	}
	
	nextTick(duration) {
		// TODO : Multiple devices
		return this.devices[0].nextTick(duration);
	}
	
	mute() {
		this.channels.forEach(function(channel) {
			channel.routine = new Routines.StopRoutine();
		})
		return this.nextTick(0);
	}
}

class SequenceTimer {
	constructor(beatsPerMinute, linesPerBeat, ticksPerLine){
		this._beatsPerMinute = beatsPerMinute;
		this._linesPerBeat = linesPerBeat;
		this._ticksPerLine = ticksPerLine;
		
		this.tickCount = 0;
		this.lineCount = 0;
	}

	get tick() {
		return this.tickCount;
	}
	
	set tick(newVal) {
		// Only intended for increments, but could be repurposed to allow jumps
		this.tickCount = newVal;
		if(this.tickCount % this.ticksPerLine == 0) {
			this.lineCount++;
			this.tickCount = 0;
		}
    }
    
	get line() {
		return this.lineCount;
    }
    
    get tickDuration() {
		// Changing the speed invalidates the tick duration.
		// If we change all 3, we won't have to recalculate 3 times.
		if (!this.duration) this.refreshTickDuration();
		
		return this.duration;
	}

	get beatsPerMinute() {
		return this._beatsPerMinute;
	}

	get linesPerBeat() {
		return this._linesPerBeat;
	}
	
	get ticksPerLine() {
		return this._ticksPerLine;
	}
	
	set timing(timingObj) {
		if(timingObj.beatsPerMinute) this._beatsPerMinute = timingObj.beatsPerMinute
		if(timingObj.linesPerBeat) this._linesPerBeat = timingObj.linesPerBeat
		if(timingObj.ticksPerLine) this._ticksPerLine = timingObj.ticksPerLine
		this.duration = undefined;
	}

	refreshTickDuration() {
		// Tick duration in milliseconds
		this.duration = 60000/(this._beatsPerMinute*this._linesPerBeat*this._ticksPerLine);
	}
}

class SteamControllerSequence {
	constructor() {
		this.channelUpdates = {};
		this.timerUpdates = {};
		this.lastLine = 0;
	}

	add(lineNum, channel, routine) {
		if(!channel instanceof SteamControllerChannel){
			throw "SteamControllerSequence#add called with an invalid channel."
		} else if(!routine instanceof Routines.ChannelRoutine){
			throw "SteamControllerSequence#add called with an invalid routine."
		}

		if(!this.channelUpdates[lineNum]) this.channelUpdates[lineNum] = [];
		this.channelUpdates[lineNum].push({
			channel: channel,
			routine: routine,
		})

		if(lineNum > this.lastLine) this.lastLine = lineNum;
	}

	setTime(lineNum, tempo, linesPerBeat, speed) {
		this.timerUpdates[lineNum] = {
			beatsPerMinute: tempo,
			linesPerBeat: linesPerBeat,
			ticksPerLine: speed,
		}
	}

	atLine(lineNum) {
		return {
			channelUpdates: (this.channelUpdates[lineNum] || []),
			timerUpdate: this.timerUpdates[lineNum],
		}
	}
}

var playerSingleton = new SteamControllerPlayer()

module.exports = {
	get SteamControllerPlayer() {
		return playerSingleton;
	},
	// not the timer
	SteamControllerSequence: SteamControllerSequence,
	Routines: Routines,
}
