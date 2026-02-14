const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    adminNotes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ContactUs", contactUsSchema);
