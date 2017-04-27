const OpenMTP_Module = require('node-libopenmpt');
var Promise = require("bluebird");
const fs = require('fs');

var readFile = Promise.promisify(require('fs').readFile);

var tmpFilePathVar = 'alf2_zalza_edit.xm';

readFile(tmpFilePathVar).then(function(data) {
    return new OpenMTP_Module(data);
}).then(function(module){
	for(var order = module.current_order; order < module.num_orders; order++) {
		const pattern = module.get_order_pattern(order);
		for(var row = 0; row < module.get_pattern_num_rows(pattern); row++) {
			module.set_position_order_row(order, row);
			var channelUpdates = [];
			for(var channel = 0; channel < module.num_channels; channel++) {
				channelUpdates.push(module.get_pattern_row_channel(pattern, row, channel))
			}
			var rowString = "";
			channelUpdates.forEach(function(update, idx){
				if(idx !== 0) rowString += " | ";
				rowString += update.string;
			})
			console.log(rowString)
		}
	}
});
