const mongoose = require("mongoose");
const { DateTime } = require("luxon");

const createdOn = DateTime.now().toLocaleString({
  weekday: "short",
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

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
    default: createdOn,
  },
});

const depositModel = mongoose.model("deposit", depositSchema);

module.exports = depositModel;
