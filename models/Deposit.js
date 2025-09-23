const mongoose = require("mongoose");
const { DateTime } = require("luxon");

const depositSchema = new mongoose.Schema({
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
    type: String,
    default: () => Date.now().toLocaleString(),
  },
});

const depositModel = mongoose.model("deposit", depositSchema);

module.exports = depositModel;
