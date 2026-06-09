const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    readByAdminAt: {
      type: Date,
      default: null,
    },
    readByUserAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

chatMessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
