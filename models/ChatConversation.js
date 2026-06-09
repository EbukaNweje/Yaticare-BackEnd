const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    adminEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: process.env.Admin_Contact_Email || "",
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    lastMessage: {
      type: String,
      default: "",
      trim: true,
    },
    lastSenderRole: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadByAdmin: {
      type: Number,
      default: 0,
    },
    unreadByUser: {
      type: Number,
      default: 0,
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

chatConversationSchema.index({ userEmail: 1 }, { unique: true });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
