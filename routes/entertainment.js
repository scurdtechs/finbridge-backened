const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const EntertainmentItem = require("../models/entertainmentitem");

// ================= LIST =================
router.get("/entertainment/items", requireAuth, async (req, res) => {
  const { category } = req.query;
  const filter = {};
  if (category) filter.category = String(category);
  const items = await EntertainmentItem.find(filter).sort({ createdAt: -1 }).limit(50);
  return res.json({ items });
});

// ================= CREATE =================
router.post("/entertainment/items", requireAuth, async (req, res) => {
  try {
    const { category, mediaType, title, description, url } = req.body;
    if (!category) return res.status(400).json({ message: "category is required" });

    const item = await EntertainmentItem.create({
      userId: req.user._id,
      category: String(category),
      mediaType: mediaType ? String(mediaType) : "",
      title: title ? String(title) : "",
      description: description ? String(description) : "",
      url: url ? String(url) : "",
      participants: ["gaming"].includes(String(category)) ? [req.user._id] : [],
    });

    return res.status(201).json({ message: "Created", item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= LIKE TOGGLE =================
router.post("/entertainment/items/:id/like", requireAuth, async (req, res) => {
  try {
    const item = await EntertainmentItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const idx = item.likes.findIndex((id) => String(id) === String(req.user._id));
    if (idx >= 0) item.likes.splice(idx, 1);
    else item.likes.push(req.user._id);

    await item.save();
    return res.json({ message: "Like updated", likesCount: item.likes.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= JOIN GAMING CHALLENGE =================
router.post("/entertainment/items/:id/join", requireAuth, async (req, res) => {
  try {
    const item = await EntertainmentItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.category !== "gaming") return res.status(400).json({ message: "Not a gaming challenge" });

    const already = item.participants.some((id) => String(id) === String(req.user._id));
    if (!already) item.participants.push(req.user._id);
    await item.save();
    return res.json({ message: "Joined", participantsCount: item.participants.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

