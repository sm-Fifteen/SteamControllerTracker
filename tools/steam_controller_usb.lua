require("bit")

-- USB frame (abstracted)
-- -- USB Control transfer
-- -- -- SC message
-- -- -- -- SC feedback


steam_controller_feedback = Proto("sc_feedback",  "Steam Controller feedback message")

msgType = ProtoField.uint8("sc_feedback.msgType")
msgLength = ProtoField.uint8("sc_feedback.msgLength")
hapticId = ProtoField.uint8("sc_feedback.hapticId")
hiPulseLength = ProtoField.uint16("sc_feedback.hiPulseLength")
loPulseLength = ProtoField.uint16("sc_feedback.loPulseLength")
repeatCount = ProtoField.uint16("sc_feedback.repeatCount")
leftoverBytes = ProtoField.bytes("sc_feedback.leftoverBytes")

steam_controller_feedback.fields = {
	msgType,
	msgLength,
	hapticId,
	hiPulseLength,
	loPulseLength,
	repeatCount,
	leftoverBytes
}

				
function steam_controller_feedback.dissector(tvb, pinfo, tree)
	if tvb:len() < 71 then return 0 end
	dataBuffer = tvb:range(7, 64) -- To get rid of the 7 bits control header
	pinfo.cols.protocol = "sc_feedback";
	
	mType = dataBuffer(0,1):uint()
	mLength = dataBuffer(1,1):uint()
	
	if mType ~= 0x8f then return 0 end
	
	subtree = tree:add(steam_controller_feedback,dataBuffer())
	
	subtree:add(msgType, dataBuffer(0,1)):append_text(" (STEAM CONTROLLER HAPTIC FEEDBACK)")
	subtree:add(msgLength, dataBuffer(1,1))
	
	msgBuffer = dataBuffer:range(2, mLength)
	
	subtree:add(hapticId, msgBuffer(0,1))
	subtree:add(hiPulseLength, msgBuffer(1,2):le_uint())
	subtree:add(loPulseLength, msgBuffer(3,2):le_uint())
	subtree:add(repeatCount, msgBuffer(5,2):le_uint())
	subtree:add(leftoverBytes, msgBuffer(7))
	
	return mLength
end


local parent_subfield = DissectorTable.get("usb.product")
parent_subfield:add(0x28de1102,steam_controller_feedback) --USB controller
parent_subfield:add(0x28de1142,steam_controller_feedback) --Dongle