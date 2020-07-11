var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Message = new Schema({
    author: [{type: Schema.Types.ObjectId, ref: 'Accounts'}],
    recipient: [{type: Schema.Types.ObjectId, ref: 'Accounts'}],
    room_name: {type: String, required: true, max: 60},
    text: {type: String, required: true},
    timestamp: {type: Date}
});


module.exports = mongoose.model('Message', Message);
