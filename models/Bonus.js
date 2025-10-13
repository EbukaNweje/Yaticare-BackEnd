// models/Bonus.js
const mongoose = require("mongoose");

const BonusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    reason: { type: String }, // e.g., "Referral Bonus"
    date: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("bonus", BonusSchema);
