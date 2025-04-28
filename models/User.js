const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },

    date: {
        type: Date,
        default: Date.now
    },

    phoneNumber: {
        type: String,
        required: true
    },

    referralCode: {
        type: String,
        required: true
    },

    inviteCode: {
        type: String,
        required: true
    },

    accountBalance: {
        type: Number,
        default: 0
    },

    BankInfo: {
            bankName: {
                type: String,
            },
            accountNumber: {
                type: String,
            },
            accountName: {
                type: String,
            }
    },

    status: {
        type: Boolean,
        default: false
    },

    isLogin: {
        type: Boolean,
        default: false
    },

    userEmailVerify: {
        type: Boolean,
        default: false
    },

    userSubscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription"
    },

    userTransaction: {
        deposit: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "deposit"
        }],
        withdraw: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "withdraw"
        }]
    }   
,

  
    
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
