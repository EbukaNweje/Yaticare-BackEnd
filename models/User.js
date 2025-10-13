const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },

    pin: {
      type: String,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    phoneNumber: {
      type: String,
      required: true,
    },

    referralCode: {
      type: String,
    },

    inviteCode: {
      code: {
        type: String,
        required: true,
      },

      bonusAmount: {
        type: Number,
      },

      userInvited: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },

    referralCount: {
      type: Number,
      default: 0,
    },

    accountBalance: {
      type: Number,
      default: 0,
    },

    WalletInfo: {
      WalletName: {
        type: String,
        default: "",
      },
      WalletAddress: {
        type: String,
        default: "",
      },
    },

    // BankInfo: {
    //         bankName: {
    //             type: String,
    //         },
    //         accountNumber: {
    //             type: String,
    //         },
    //         accountName: {
    //             type: String,
    //         }
    // },

    status: {
      type: Boolean,
      default: false,
    },

    isLogin: {
      type: Boolean,
      default: false,
    },

    userEmailVerify: {
      type: Boolean,
      default: false,
    },

    userSubscription: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
      },
    ],

    userTransaction: {
      deposit: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "deposit",
        },
      ],
      withdrawal: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "withdrawal",
        },
      ],

      subscriptionsHistory: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subscription",
        },
      ],
      bonusHistory: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "bonus",
        },
      ],
      dailyInterestHistory: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "dailyinterest",
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
