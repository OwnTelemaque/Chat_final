var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Friend_request = new Schema({
    account_requesting: [{type: Schema.Types.ObjectId, ref: 'Account'}],
    account_requested: [{type: Schema.Types.ObjectId, ref: 'Account'}],
    status: { type: String, required: true, min: 3, max: 20}
});

module.exports = mongoose.model('Friend_request', Friend_request);