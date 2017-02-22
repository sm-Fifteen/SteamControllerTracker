require("bit")

-- USB frame (abstracted)
-- -- USB Control transfer
-- -- -- SC message
-- -- -- -- SC feedback


steam_controller_packet = Proto("sc_packet",  "Steam Controller packet")
msgType = ProtoField.uint8("sc_packet.msgType")
msgLength = ProtoField.uint8("sc_packet.msgLength")

steam_controller_packet.fields = {
	msgType,
	msgLength
}

scPacketTable = DissectorTable.new("sc_packet.msgType", "Steam Controller Packet", ftypes.UINT8, base.HEX)

steam_controller_feedback = Proto("sc_msg_feedback",  "Steam Controller feedback message")

hapticId = ProtoField.uint8("sc_msg_feedback.hapticId")
hiPulseLength = ProtoField.uint16("sc_msg_feedback.hiPulseLength")
loPulseLength = ProtoField.uint16("sc_msg_feedback.loPulseLength")
repeatCount = ProtoField.uint16("sc_msg_feedback.repeatCount")
leftoverBytes = ProtoField.bytes("sc_msg_feedback.leftoverBytes")

steam_controller_feedback.fields = {
	hapticId,
	hiPulseLength,
	loPulseLength,
	repeatCount,
	leftoverBytes
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
				
function steam_controller_feedback.dissector(msgBuffer, pinfo, tree)
	pinfo.cols.protocol = "SC_feedback";
	
	subtree = tree:add(steam_controller_feedback,msgBuffer())
	
	subtree:add(hapticId, msgBuffer(0,1))
	subtree:add_le(hiPulseLength, msgBuffer(1,2))
	subtree:add_le(loPulseLength, msgBuffer(3,2))
	subtree:add_le(repeatCount, msgBuffer(5,2))
	subtree:add(leftoverBytes, msgBuffer(7))
	
	return mLength
end

scPacketTable:add(0x8f, steam_controller_feedback)

local parent_subfield = DissectorTable.get("usb.product")
parent_subfield:add(0x28de1102,steam_controller_packet) --USB controller
parent_subfield:add(0x28de1142,steam_controller_packet) --Dongle
