const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },

    email: {type: String,required: true,unique: true},

    googleId:{type: String,unique: true,sparse: true},

    password: {type: String,required: false},

    referralCode: {type: String,unique: true,sparse:true},

    referredBy: {type: mongoose.Schema.Types.ObjectId,ref: "User",default: null},

    role: { type: String, default: 'user' },

    isBlocked: {type: Boolean,default: false},

    createdAt: {type: Date,default: Date.now}

});

module.exports = mongoose.model("User", userSchema);

