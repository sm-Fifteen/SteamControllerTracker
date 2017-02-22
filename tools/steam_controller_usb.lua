require("bit")

-- Dissector Table for steam controller control packets
scPacketTable = DissectorTable.new("sc_packet.msgType", "Steam Controller Packet", ftypes.UINT8, base.HEX)

------------------------------------------------------
-- Wrapper (USB Control transfer decoder)
------------------------------------------------------

steam_controller_packet = Proto("sc_packet",  "Steam Controller packet")
msgType = ProtoField.uint8("sc_packet.msgType", "Message type", base.HEX)
msgLength = ProtoField.uint8("sc_packet.msgLength", "Message length")

steam_controller_packet.fields = {
	msgType,
	msgLength
}

function steam_controller_packet.dissector(tvb, pinfo, tree)
	if tvb:len() < 71 then return 0 end
	dataBuffer = tvb:range(7, 64) -- To get rid of the 7 bits control header
	pinfo.cols.protocol = "SC_set_report";
	
	subtree = tree:add(steam_controller_packet,dataBuffer())
	
	mType = dataBuffer(0,1)
	mLength = dataBuffer(1,1)
	
	subtree:add(msgType, mType)
	subtree:add(msgLength, mLength)
	
	packetDissector = scPacketTable:get_dissector(mType:uint())
	msgBuffer = dataBuffer(2, mLength:uint()):tvb()
	
	if packetDissector == nil then
		undecodedEntry = tree:add(msgBuffer(), "Unknown Steam Controller message (type 0x", tostring(mType:bytes()), ", length ", mLength:uint(),")")
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
	pinfo.cols.protocol = "SC_feedback";
	
	subtree = tree:add(steam_controller_feedback,msgBuffer())
	
	subtree:add(hapticId, msgBuffer(0,1))
	subtree:add_le(hiPulseLength, msgBuffer(1,2))
	subtree:add_le(loPulseLength, msgBuffer(3,2))
	subtree:add_le(repeatCount, msgBuffer(5,2))
	
	local remaining = msgBuffer(7)
	
	if remaining:len() ~= 0 then
		local remainingEntry = subtree:add(remaining, "Unknown extra bytes:", tostring(remaining:bytes()))
		remainingEntry:add_expert_info(PI_UNDECODED, PI_NOTE)
	end
	
	return mLength
end

scPacketTable:add(0x8f, steam_controller_feedback)

------------------------------------------------------

local parent_subfield = DissectorTable.get("usb.product")
parent_subfield:add(0x28de1102,steam_controller_packet) --USB controller
parent_subfield:add(0x28de1142,steam_controller_packet) --Dongle
