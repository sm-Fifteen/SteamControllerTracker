var {ChannelRoutine, RawFeedback, ConstantFrequency, ArpeggioNote, FlatNote, StopRoutine} = require("./sc_routine.js");
var {SteamControllerSequence, SteamControllerPlayer} = require("./sc_player.js");

function playerTest() {
	var sequence = new SteamControllerSequence();
	var channels = SteamControllerPlayer.channels;

	sequence.add(16, channels[0], new StopRoutine());
	sequence.add(16, channels[1], new StopRoutine());

	sequence.add(0, channels[0], new ArpeggioNote(86, 12, 0));
	sequence.add(0, channels[1], new ArpeggioNote(86, 0, 12));

	sequence.add(3, channels[0], new StopRoutine());
	sequence.add(3, channels[1], new StopRoutine());

	sequence.add(4, channels[0], new ArpeggioNote(77, 12, 0));
	sequence.add(4, channels[1], new ArpeggioNote(77, 0, 12));

	sequence.add(6, channels[0], new StopRoutine());
	sequence.add(6, channels[1], new StopRoutine());

	sequence.add(7, channels[0], new ArpeggioNote(77, 12, 0));
	sequence.add(7, channels[1], new ArpeggioNote(77, 0, 12));

	sequence.add(8, channels[0], new StopRoutine());
	sequence.add(8, channels[1], new StopRoutine());

	sequence.add(9, channels[0], new ArpeggioNote(79, 12, 0));
	sequence.add(9, channels[1], new ArpeggioNote(79, 0, 12));


	sequence.add(11, channels[0], new StopRoutine());
	sequence.add(11, channels[1], new StopRoutine());

	sequence.add(12, channels[0], new ArpeggioNote(81, 12, 0));
	sequence.add(12, channels[1], new ArpeggioNote(81, 0, 12));

	sequence.add(16, channels[0], new StopRoutine());
	sequence.add(16, channels[1], new StopRoutine());

	var sequencePromise = SteamControllerPlayer.playSequence(sequence, 110, 2, 6)
}

playerTest();
