const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g. "INTEREST", "REMINDER", "RECYCLE", "EXPIRE"
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription" },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
