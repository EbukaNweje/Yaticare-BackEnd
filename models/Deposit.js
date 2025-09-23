const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      default: "Deposit",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    amount: {
      type: Number,
      required: true,
    },
    amountusdt: {
      type: Number,
      required: true,
    },
    PaymentType: {
      type: String,
      enum: ["USDT", "BANK"],
    },
    total: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed"],
      default: "pending",
    },
    depositDate: {
      type: Date,
      default: () => new Date(),
      get: (val) =>
        val
          ? new Date(val).toLocaleString("en-GB", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
    },
  },
  {
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const depositModel = mongoose.model("deposit", depositSchema);

module.exports = depositModel;
