const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getConversations,
  getConversationByEmail,
  getConversationMessages,
  markConversationRead,
} = require("../controllers/Chat");

router.post("/messages", sendMessage);
router.get("/conversations", getConversations);
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.patch("/conversations/:conversationId/read", markConversationRead);
router.get("/user/:email", getConversationByEmail);

module.exports = router;
