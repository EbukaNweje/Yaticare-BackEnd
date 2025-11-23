const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentPlan", // ✅ Correct reference
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isSubscriptionRecycle: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
    },
    amount: {
      type: Number,
      required: true,
    },
    subscriptionDate: {
      type: String,
    },
    showDate: {
      type: String,
    },
    lastBonusAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);
