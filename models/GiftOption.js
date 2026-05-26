const mongoose = require("mongoose");

const GiftOptionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GiftOption", GiftOptionSchema);
