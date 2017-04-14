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
		var timer = new SequenceTimer(sequence, this.nextTick.bind(this), beatsPerMinute, linesPerBeat, ticksPerLine);

		return this.playTick(timer);
	}

	playTick(timer) {
		var promise = SequenceTimer.playTick(timer);
		if(!timer.time.finished){
			return promise.bind(this).then(this.playTick);
		}
	}

	nextTick(tickDuration) {
		return this.devices[0].nextTick(tickDuration)
	}
}

class SequenceTimer {
	constructor(sequence, tickerFn, beatsPerMinute, linesPerBeat, ticksPerLine){
		this._beatsPerMinute = beatsPerMinute;
		this._linesPerBeat = linesPerBeat;
		this._ticksPerLine = ticksPerLine;
		this.refreshTickDuration();
		this.sequence = sequence;
		this.tickerFn = tickerFn;
		this.tickCount = 0;
		this.lineCount = 0;
	}

	static playTick(timer) {
		timer.time.channelUpdates.forEach(function(channelUpdate){
			channelUpdate.channel.routine = channelUpdate.routine;
		})

		console.log(timer.time)

		return timer.tickerFn(timer.time.duration).then(function(){
			// TickerFn does not return the timer
			timer.tick();
			return timer;
		});
	}

	tick() {
		this.tickCount++;
		if(this.tickCount % this.ticksPerLine == 0) {
			this.lineCount++;
			this.tickCount = 0;
		}
	}

	get time() {
		var line = this.sequence.atLine(this.lineCount);
		return _.extend(line, {
			duration: this.duration,
			line: this.lineCount,
			tick: this.tickCount,
			finished: (this.sequence.lastLine < this.lineCount)
		})
	}

	get beatsPerMinute() {
		return this._beatsPerMinute;
	}

	set beatsPerMinute(newBPM) {
		this._beatsPerMinute = newBPM;
		this.refreshTickDuration();
	}

	get linesPerBeat() {
		return this._linesPerBeat;
	}

	set linesPerBeat(newLPB) {
		this._linesPerBeat = newLPB;
		this.refreshTickDuration();
	}

	get ticksPerLine() {
		return this._ticksPerLine;
	}

	set ticksPerLine(newTPL) {
		this._ticksPerLine = newTPL;
		this.refreshTickDuration();
	}

	refreshTickDuration() {
		// Tick duration in milliseconds
		this.duration = 60000/(this._beatsPerMinute*this._linesPerBeat*this._ticksPerLine);
	}
}

class SteamControllerSequence {
	constructor() {
		this.channelUpdates = {};
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

	atLine(lineNum) {
		return {
			channelUpdates: (this.channelUpdates[lineNum] || []),
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
