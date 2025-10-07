const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const { authenticateToken } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/talksync",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", authenticateToken, messageRoutes);

// Socket.io connection handling
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(userId);
  });

  socket.on("sendMessage", (messageData) => {
    // Broadcast to recipient if online
    const recipientSocketId = connectedUsers.get(messageData.recipient);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newMessage", messageData);
    }
    // Also send back to sender
    socket.emit("messageConfirm", messageData);
  });

  socket.on("disconnect", () => {
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
