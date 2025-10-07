const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

// Send message
router.post("/send", async (req, res) => {
  try {
    const { recipient, content, messageType = "text" } = req.body;

    const message = new Message({
      sender: req.userId,
      recipient,
      content,
      messageType,
    });

    await message.save();
    await message.populate("sender", "username avatar");

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conversation between two users
router.get("/conversation/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    })
      .populate("sender", "username avatar")
      .populate("recipient", "username avatar")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.put("/read/:userId", async (req, res) => {
  try {
    await Message.updateMany(
      { sender: req.params.userId, recipient: req.userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
