const { Server } = require("socket.io");

let ioInstance = null;

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const conversationRoom = (conversationId) =>
  `chat:conversation:${conversationId}`;

const userRoom = (email) => `chat:user:${normalizeEmail(email)}`;

const adminRoom = "chat:admins";

const registerChatSocket = (server) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  ioInstance.on("connection", (socket) => {
    socket.on("chat:join", ({ conversationId, email, role } = {}) => {
      if (conversationId) {
        socket.join(conversationRoom(conversationId));
      }

      if (email) {
        socket.join(userRoom(email));
      }

      if (role === "admin") {
        socket.join(adminRoom);
      }

      socket.data.chat = {
        conversationId: conversationId || socket.data.chat?.conversationId,
        email: email ? normalizeEmail(email) : socket.data.chat?.email,
        role: role || socket.data.chat?.role,
      };
    });

    socket.on("chat:leave", ({ conversationId, email } = {}) => {
      if (conversationId) {
        socket.leave(conversationRoom(conversationId));
      }

      if (email) {
        socket.leave(userRoom(email));
      }
    });

    socket.on("disconnect", () => {
      socket.data.chat = null;
    });
  });

  return ioInstance;
};

const getChatIO = () => ioInstance;

module.exports = {
  registerChatSocket,
  getChatIO,
  conversationRoom,
  userRoom,
  adminRoom,
  normalizeEmail,
};
