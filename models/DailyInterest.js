// models/DailyInterest.js
const mongoose = require("mongoose");

const DailyInterestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("dailyinterest", DailyInterestSchema);
