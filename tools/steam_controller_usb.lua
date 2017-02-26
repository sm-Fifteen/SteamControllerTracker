require("bit")

-- Dissector Table for steam controller control packets
scPacketTable = DissectorTable.new("sc_packet.msgType", "Steam Controller Packet", ftypes.UINT8, base.HEX)

------------------------------------------------------
-- USB Control transfer heuristic (for the setup header)
------------------------------------------------------

-- usb.control heuristics get the URB setup header minus the first byte
-- and the data inside it, exactly what the usb dissector tables get sent.
-- That a bug?

function sc_packet_heuristic(tvb, pinfo, tree)
	if tvb:len() == 0 then return false end
	
	--bmRequestTypeBuf = tvb(0,1)
	bRequestBuf = tvb(0,1)
	wValueBuf = tvb(1,2)
	wIndexBuf = tvb(3,2)
	wLengthBuf = tvb(5,2)
	dataBuffer = tvb(7):tvb()
	
	if wLengthBuf:le_uint() ~= dataBuffer:len() then
		return false
	end
	
	-- Dissect the packet it and return true
	sc_packet_dissector:call(dataBuffer, pinfo, tree)
	return true
end

------------------------------------------------------
-- Wrapper
------------------------------------------------------

steam_controller_packet = Proto("sc_packet",  "Steam Controller packet")
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
	
	pinfo.cols.info = "MSG 0x" .. tostring(mType:bytes());
	
	if packetDissector == nil then
		undecodedEntry = tree:add(msgBuffer(), "Unknown Steam Controller message (type:", "0x" .. tostring(mType:bytes()), ", length:", mLength:uint(),")")
		undecodedEntry:add_expert_info(PI_UNDECODED)
		
		return
	end
	
	packetDissector:call(msgBuffer, pinfo, tree)
end

------------------------------------------------------
-- Type 0x8f : Feedback
------------------------------------------------------

steam_controller_feedback = Proto("sc_msg_feedback",  "Steam Controller feedback message")

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
	
	pinfo.cols.info = "FEEDBACK (0x8f) : " .. hapticName .. " " .. state;
	
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

sc_packet_dissector = steam_controller_packet.dissector
steam_controller_packet:register_heuristic("usb.control", sc_packet_heuristic)
--dTable:add(0x28de1102,steam_controller_packet) --USB controller
--dTable:add(0x28de1142,steam_controller_packet) --Dongle
