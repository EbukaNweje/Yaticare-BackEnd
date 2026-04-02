const mongoose = require("mongoose");

const TestimonialSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testimonial: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    approved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Testimonial", TestimonialSchema);
