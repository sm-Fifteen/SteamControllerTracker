require("bit")

-- Dissector Table for steam controller control packets
scPacketTable = DissectorTable.new("sc_packet.msgType", "Steam Controller Packet", ftypes.UINT8, base.HEX)
scConfigTable = DissectorTable.new("sc_config.configType", "Steam Controller Config", ftypes.UINT8, base.HEX)

------------------------------------------------------
-- USB Control transfer dissector (for the setup header)
------------------------------------------------------

sc_usb_setup = Proto("SC_USB_SETUP",  "USB Setup header")


function sc_usb_setup.dissector(tvb, pinfo, tree)
	if tvb:len() == 0 then return false end
	
	--bmRequestTypeBuf = tvb(0,1)
	bRequestBuf = tvb(0,1)
	wValueBuf = tvb(1,2)
	wIndexBuf = tvb(3,2)
	wLengthBuf = tvb(5,2)
	dataBuffer = tvb(7):tvb()
	
	if wLengthBuf:le_uint() ~= dataBuffer:len() then
		return 0
	end
	
	sc_packet_dissector:call(dataBuffer, pinfo, tree)
	return 7 + dataBuffer:len();
end

------------------------------------------------------
-- Wrapper
------------------------------------------------------

steam_controller_packet = Proto("SC_MSG",  "Steam Controller packet")
msgType = ProtoField.uint8("sc_packet.msgType", "Message type", base.HEX)
msgLength = ProtoField.uint8("sc_packet.msgLength", "Message length")

steam_controller_packet.fields = {
	msgType,
	msgLength
}

function steam_controller_packet.dissector(tvb, pinfo, tree)
	pinfo.cols.protocol = "sc_set_report";
	
	subtree = tree:add(steam_controller_packet,dataBuffer())
	
	mType = dataBuffer(0,1)
	mLength = dataBuffer(1,1)
	
	subtree:add(msgType, mType)
	subtree:add(msgLength, mLength)
	
	packetDissector = scPacketTable:get_dissector(mType:uint())
	msgBuffer = dataBuffer(2, mLength:uint()):tvb()
	
	pinfo.cols.info = "0x" .. tostring(mType:bytes());
	
	if packetDissector == nil then
		pinfo.cols.info:prepend(pinfo.curr_proto .. " ")
		undecodedEntry = tree:add(msgBuffer(), "Unknown Steam Controller message (type:", "0x" .. tostring(mType:bytes()), ", length:", mLength:uint(),")")
		undecodedEntry:add_expert_info(PI_UNDECODED)
		
		return
	end
	
	--PacketDissector.name : Add this to msgType
	packetDissector:call(msgBuffer, pinfo, tree)
end

------------------------------------------------------
-- Lookup table for built-in sound IDs
------------------------------------------------------

builtinSounds = {
	[0x00] = "Warm and happy",
	[0x01] = "Invader",
	[0x02] = "Controller confirmed",
	[0x03] = "Victory",
	[0x04] = "Rise and Shine",
	[0x05] = "Shorty",
	[0x06] = "Warm boot",
	[0x07] = "Next level",
	[0x08] = "Shake it off",
	[0x09] = "Access denied",
	[0x0a] = "Deactivate",
	[0x0b] = "Discovery",
	[0x0c] = "Triumph",
	[0x0d] = "The Mann"
}

function updatePinfo(pinfo, curr_proto)
	pinfo.cols.info:prepend(pinfo.curr_proto .. " (")
	pinfo.cols.info:append(")")
end

------------------------------------------------------
-- Type 0x8f : Feedback
------------------------------------------------------

steam_controller_feedback = Proto("feedback",  "Steam Controller feedback")

hapticId = ProtoField.uint8("sc_msg_feedback.hapticId", "Selected acuator")
hiPulseLength = ProtoField.uint16("sc_msg_feedback.hiPulseLength", "High pulse duration")
loPulseLength = ProtoField.uint16("sc_msg_feedback.loPulseLength", "Low pulse duration")
repeatCount = ProtoField.uint16("sc_msg_feedback.repeatCount", "Repetitions")

steam_controller_feedback.fields = {
	hapticId,
	hiPulseLength,
	loPulseLength,
	repeatCount
}

function steam_controller_feedback.dissector(msgBuffer, pinfo, tree)
	hapticIdBuf = msgBuffer(0,1);
	hiPulseLengthBuf = msgBuffer(1,2);
	loPulseLengthBuf = msgBuffer(3,2);
	repeatCountBuf = msgBuffer(5,2);
	
	if hapticIdBuf:uint() == 0 then hapticName = "LEFT"
	else hapticName = "RIGHT" end
	
	period = (hiPulseLengthBuf:uint() + loPulseLengthBuf:uint());
	if period ~= 0 then state = "AT " .. math.floor(1000000.0/period) .. " Hz"
	else state = "STOP" end
	
	updatePinfo(pinfo)
	pinfo.cols.info:append(": " .. hapticName .. " " .. state)
	
	subtree = tree:add(steam_controller_feedback,msgBuffer())
	
	subtree:add(hapticId, hapticIdBuf)
	subtree:add_le(hiPulseLength, hiPulseLengthBuf)
	subtree:add_le(loPulseLength, loPulseLengthBuf)
	subtree:add_le(repeatCount, repeatCountBuf)
	
	local remaining = msgBuffer(7)
	
	if remaining:len() ~= 0 then
		local remainingEntry = subtree:add(remaining, "Unknown extra bytes:", tostring(remaining:bytes()))
		remainingEntry:add_expert_info(PI_UNDECODED, PI_NOTE)
	end
	
	return mLength
end

scPacketTable:add(0x8f, steam_controller_feedback)

------------------------------------------------------
-- Type 0x81 : Disable lizard mode
------------------------------------------------------

steam_controller_lizard_off = Proto("lizard_off", "Steam Controller disable lizard mode")
				
function steam_controller_lizard_off.dissector(msgBuffer, pinfo, tree)
	updatePinfo(pinfo)

	return 0
end

scPacketTable:add(0x81, steam_controller_lizard_off)

------------------------------------------------------
-- Type 0x85 : Enable lizard mode
------------------------------------------------------

steam_controller_lizard_on = Proto("lizard_on", "Steam Controller enable lizard mode")
				
function steam_controller_lizard_on.dissector(msgBuffer, pinfo, tree)
	updatePinfo(pinfo)

	return 0
end

scPacketTable:add(0x85, steam_controller_lizard_on)

------------------------------------------------------
-- Type 0xB6 : Play builtin sound
------------------------------------------------------

steam_controller_play_sound = Proto("play_sound", "Steam Controller builtin sound")

soundIdField = ProtoField.uint8("sc_msg_feedback.soundId", "Sound Id")

steam_controller_feedback.fields = { soundIdField }

function steam_controller_play_sound.dissector(msgBuffer, pinfo, tree)
	soundIdBuf = msgBuffer(0,1)
	soundId = soundIdBuf:uint()
	
	subtree:add(soundIdField, soundIdBuf)

	local sound = builtinSounds[soundId] or "UNKNOWN";
	updatePinfo(pinfo)
	pinfo.cols.info:append(": " .. sound .. " (0x" .. tostring(soundIdBuf:bytes()) ..")")

	return 1
end

scPacketTable:add(0xb6, steam_controller_play_sound)

------------------------------------------------------
-- Type 0x87 : Configure
------------------------------------------------------

sc_config = Proto("config", "Steam controller configuration")

configTypeField = ProtoField.uint8("sc_msg_config.configType", "Configured field ID", base.HEX)

sc_config.fields = { configTypeField }

function sc_config.dissector(msgBuffer, pinfo, tree)
	configTypeBuf = msgBuffer(0,1)
	configType = configTypeBuf:uint()
	subtree:add(configTypeField, configTypeBuf)
	
	updatePinfo(pinfo)
	
	configDissector = scConfigTable:get_dissector(configType)
	configBuffer = msgBuffer(1):tvb()
	
	if configDissector == nil then
		undecodedEntry = tree:add(configBuffer(), "Steam Controller config message of unknown type")
		undecodedEntry:add_expert_info(PI_UNDECODED)
		
		return
	end
	
	configDissector:call(configBuffer, pinfo, tree)
end

scPacketTable:add(0x87, sc_config)

------------------------------------------------------
-- Configure 0x2d : LED control
------------------------------------------------------

------------------------------------------------------
-- Configure 0x30 : ???
------------------------------------------------------

------------------------------------------------------
-- Configure 0x32 : ???
------------------------------------------------------

------------------------------------------------------
-- Configure 0x3a : ???
------------------------------------------------------

------------------------------------------------------

sc_packet_dissector = steam_controller_packet.dissector
--Note that these only work if the device descriptors are present in the capture.
dTable = DissectorTable.get("usb.product")
dTable:add(0x28de1102,sc_usb_setup) --USB controller
dTable:add(0x28de1142,sc_usb_setup) --Dongle
