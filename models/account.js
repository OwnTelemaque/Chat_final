var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Account = new Schema({
    username: {type: String, required: true, min: 3, max: 30},
    username_lower: String,
    password: String,
    friends: [{type: Schema.Types.ObjectId, ref: 'Account'}],
    pending_demands: [{type: Schema.Types.ObjectId, ref: 'Friend_request'}]
});

//permet la gestion des login dans passport - Hashage, sallage
Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
