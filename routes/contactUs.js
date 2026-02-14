const express = require("express");
const router = express.Router();
const {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  updateContactMessage,
  deleteContactMessage,
  getContactMessagesByEmail,
  getContactStats,
} = require("../controllers/ContactUs");

/**
 * Public Routes
 */

// Create a new contact message (Public)
router.post("/createContactMessage", createContactMessage);

// Get contact messages by email (Public - User can check their own messages)
router.get("/user/:email", getContactMessagesByEmail);

/**
 * Admin Routes (Should be protected with authentication middleware in production)
 */

// Get all contact messages
router.get("/", getAllContactMessages);

// Get contact statistics
router.get("/stats/overview", getContactStats);

// Get a single contact message by ID
router.get("/:id", getContactMessageById);

// Update contact message (Admin only)
router.put("/:id", updateContactMessage);

// Delete a contact message (Admin only)
router.delete("/:id", deleteContactMessage);

module.exports = router;
