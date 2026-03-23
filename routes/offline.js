const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const OfflineMessage = require("../models/offlinemessage");
const User = require("../models/user");

// ================= OFFLINE CHAT =================
router.post("/offline/chat/send", requireAuth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) return res.status(400).json({ message: "receiverId and content are required" });

    const message = await OfflineMessage.create({
      senderId: req.user._id,
      receiverId,
      content: String(content).trim(),
      read: false,
    });

    return res.status(201).json({ message: "Sent", msg: message });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/offline/chat/with/:otherUserId", requireAuth, async (req, res) => {
  const { otherUserId } = req.params;
  const messages = await OfflineMessage.find({
    $or: [
      { senderId: req.user._id, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: req.user._id },
    ],
  }).sort({ createdAt: 1 }).limit(200);

  // Mark received messages as read
  await OfflineMessage.updateMany(
    { senderId: otherUserId, receiverId: req.user._id, read: false },
    { $set: { read: true } }
  );

  return res.json({ messages });
});

// ================= OFFLINE FILE SHARING =================
router.post("/offline/files/share", requireAuth, async (req, res) => {
  try {
    const { borrowerId, itemType, fileName, fileUrl } = req.body;
    if (!borrowerId || !itemType || !fileName || !fileUrl) {
      return res.status(400).json({ message: "borrowerId, itemType, fileName, fileUrl are required" });
    }

    const borrower = await User.findById(borrowerId);
    if (!borrower) return res.status(404).json({ message: "Borrower not found" });

    borrower.offlineFiles.push({
      itemType: String(itemType).trim(),
      fileName: String(fileName).trim(),
      fileUrl: String(fileUrl).trim(),
      status: "available",
      uploadedAt: new Date(),
    });
    await borrower.save();

    return res.status(201).json({ message: "File shared", borrowerOfflineFilesCount: borrower.offlineFiles.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

