const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentPlan",
      required: true,
    },
    amount: { type: Number, required: true },

    // Core timeline
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },

    // How many daily interests have been paid in this cycle (0..7)
    daysPaid: { type: Number, default: 0 },

    // last time daily interest was paid (Date or null)
    lastBonusAt: { type: Date, default: null },

    // Flags
    mustRecycle: { type: Boolean, default: false }, // set when daysPaid reaches 6
    isPaused: { type: Boolean, default: false }, // set when user failed to recycle (pauses day7 payment)
    isSubscriptionRecycle: { type: Boolean, default: false }, // may be used for reminder email sent
    status: { type: String, enum: ["active", "expired"], default: "active" },

    // Optional: keep original duration so recycle can reuse it
    durationDays: { type: Number, required: true },

    // For human-readable dates if you want
    subscriptionDate: { type: Date, default: Date.now },
    showDate: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", SubscriptionSchema);
