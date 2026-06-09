const ChatConversation = require("../models/ChatConversation");
const ChatMessage = require("../models/ChatMessage");
const createError = require("../utilities/error");
const { sendEmail } = require("../utilities/brevo");
const {
  getChatIO,
  conversationRoom,
  userRoom,
  adminRoom,
  normalizeEmail,
} = require("../utilities/chatSocket");

const ADMIN_EMAIL = process.env.Admin_Contact_Email;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildEmailBody = ({ userName, userEmail, message, conversationId }) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2 style="margin: 0 0 12px; color: #0b3d1f;">New Live Chat Message</h2>
    <p style="margin: 0 0 8px;"><strong>User:</strong> ${escapeHtml(userName)}</p>
    <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
    <p style="margin: 0 0 8px;"><strong>Conversation ID:</strong> ${escapeHtml(conversationId)}</p>
    <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-left: 4px solid #0b3d1f; border-radius: 6px;">
      <p style="margin: 0; white-space: pre-wrap; word-break: break-word;">${escapeHtml(message)}</p>
    </div>
  </div>
`;

const serializeConversation = (conversation) => ({
  id: conversation._id,
  userEmail: conversation.userEmail,
  userName: conversation.userName,
  adminEmail: conversation.adminEmail,
  status: conversation.status,
  lastMessage: conversation.lastMessage,
  lastSenderRole: conversation.lastSenderRole,
  lastMessageAt: conversation.lastMessageAt,
  unreadByAdmin: conversation.unreadByAdmin,
  unreadByUser: conversation.unreadByUser,
  readByAdminAt: conversation.readByAdminAt,
  readByUserAt: conversation.readByUserAt,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

const serializeMessage = (message) => ({
  id: message._id,
  conversationId: message.conversation,
  senderRole: message.senderRole,
  senderName: message.senderName,
  senderEmail: message.senderEmail,
  message: message.message,
  readByAdminAt: message.readByAdminAt,
  readByUserAt: message.readByUserAt,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const emitChatUpdate = async (conversation, message) => {
  const io = getChatIO();
  if (!io) {
    return;
  }

  const conversationPayload = serializeConversation(conversation);
  const messagePayload = serializeMessage(message);

  io.to(conversationRoom(conversation._id.toString())).emit(
    "chat:message:new",
    {
      conversation: conversationPayload,
      message: messagePayload,
    },
  );

  io.to(userRoom(conversation.userEmail)).emit("chat:conversation:updated", {
    conversation: conversationPayload,
    message: messagePayload,
  });

  io.to(adminRoom).emit("chat:conversation:updated", {
    conversation: conversationPayload,
    message: messagePayload,
  });
};

const findConversationForRequest = async ({ conversationId, userEmail }) => {
  if (conversationId) {
    return ChatConversation.findById(conversationId);
  }

  if (userEmail) {
    return ChatConversation.findOne({ userEmail: normalizeEmail(userEmail) });
  }

  return null;
};

exports.sendMessage = async (req, res, next) => {
  try {
    const {
      conversationId,
      senderRole = "user",
      senderEmail,
      senderName,
      userEmail,
      userName,
      message,
    } = req.body;

    const normalizedRole = senderRole === "admin" ? "admin" : "user";
    const normalizedEmail = normalizeEmail(
      senderEmail || (normalizedRole === "user" ? userEmail : senderEmail),
    );
    const normalizedName = String(
      senderName ||
        (normalizedRole === "user" ? userName : senderName) ||
        normalizedEmail,
    ).trim();

    if (!normalizedEmail) {
      return next(createError(400, "Sender email is required"));
    }

    if (!message || !String(message).trim()) {
      return next(createError(400, "Message is required"));
    }

    let conversation = await findConversationForRequest({
      conversationId,
      userEmail: normalizedRole === "user" ? normalizedEmail : userEmail,
    });

    if (!conversation) {
      if (normalizedRole === "admin" && !userEmail) {
        return next(
          createError(
            400,
            "Conversation id or user email is required for admin replies",
          ),
        );
      }

      conversation = await ChatConversation.create({
        userEmail:
          normalizedRole === "user"
            ? normalizedEmail
            : normalizeEmail(userEmail),
        userName:
          normalizedRole === "user"
            ? normalizedName
            : String(userName || "YatiCare User").trim(),
        adminEmail: ADMIN_EMAIL || "",
        status: "open",
      });
    } else if (normalizedRole === "user" && !conversation.userName) {
      conversation.userName = normalizedName;
    }

    const chatMessage = await ChatMessage.create({
      conversation: conversation._id,
      senderRole: normalizedRole,
      senderName: normalizedName,
      senderEmail: normalizedEmail,
      message: String(message).trim(),
      readByUserAt: normalizedRole === "user" ? new Date() : null,
      readByAdminAt: normalizedRole === "admin" ? new Date() : null,
    });

    conversation.lastMessage = chatMessage.message;
    conversation.lastSenderRole = normalizedRole;
    conversation.lastMessageAt = chatMessage.createdAt;
    conversation.status = "open";
    conversation.adminEmail = conversation.adminEmail || ADMIN_EMAIL || "";

    if (normalizedRole === "user") {
      conversation.unreadByAdmin = (conversation.unreadByAdmin || 0) + 1;
      conversation.readByUserAt = chatMessage.createdAt;
    } else {
      conversation.unreadByUser = (conversation.unreadByUser || 0) + 1;
      conversation.readByAdminAt = chatMessage.createdAt;
    }

    await conversation.save();

    if (normalizedRole === "user" && ADMIN_EMAIL) {
      try {
        await sendEmail({
          email: ADMIN_EMAIL,
          subject: `New chat message from ${normalizedName}`,
          html: buildEmailBody({
            userName: normalizedName,
            userEmail: normalizedEmail,
            message: chatMessage.message,
            conversationId: conversation._id.toString(),
          }),
        });
      } catch (emailError) {
        console.error("Chat admin email failed:", emailError.message);
      }
    }

    await emitChatUpdate(conversation, chatMessage);

    res.status(201).json({
      message: "Chat message sent successfully",
      data: {
        conversation: serializeConversation(conversation),
        message: serializeMessage(chatMessage),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getConversations = async (req, res, next) => {
  try {
    const { q, status, limit = 50, page = 1 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (q) {
      const search = new RegExp(String(q).trim(), "i");
      query.$or = [
        { userEmail: search },
        { userName: search },
        { adminEmail: search },
        { lastMessage: search },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const conversations = await ChatConversation.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ChatConversation.countDocuments(query);

    res.status(200).json({
      message: "Chat conversations retrieved successfully",
      data: conversations.map(serializeConversation),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getConversationByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const normalizedEmail = normalizeEmail(email);

    const conversation = await ChatConversation.findOne({
      userEmail: normalizedEmail,
    });

    if (!conversation) {
      return res.status(200).json({
        message: "No chat conversation found for this email",
        data: null,
      });
    }

    res.status(200).json({
      message: "Chat conversation retrieved successfully",
      data: serializeConversation(conversation),
    });
  } catch (error) {
    next(error);
  }
};

exports.getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      return next(createError(404, "Chat conversation not found"));
    }

    const skip = (Number(page) - 1) * Number(limit);

    const messages = await ChatMessage.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ChatMessage.countDocuments({
      conversation: conversationId,
    });

    res.status(200).json({
      message: "Chat messages retrieved successfully",
      data: {
        conversation: serializeConversation(conversation),
        messages: messages.map(serializeMessage),
      },
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.markConversationRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { role } = req.body;
    const normalizedRole = role === "admin" ? "admin" : "user";

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      return next(createError(404, "Chat conversation not found"));
    }

    const update = {};

    if (normalizedRole === "admin") {
      update.unreadByAdmin = 0;
      update.readByAdminAt = new Date();
      await ChatMessage.updateMany(
        { conversation: conversationId, readByAdminAt: null },
        { $set: { readByAdminAt: new Date() } },
      );
    } else {
      update.unreadByUser = 0;
      update.readByUserAt = new Date();
      await ChatMessage.updateMany(
        { conversation: conversationId, readByUserAt: null },
        { $set: { readByUserAt: new Date() } },
      );
    }

    await ChatConversation.findByIdAndUpdate(conversationId, update, {
      new: true,
    });

    res.status(200).json({
      message: "Conversation marked as read",
    });
  } catch (error) {
    next(error);
  }
};
