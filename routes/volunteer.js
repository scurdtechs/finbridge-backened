const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const VolunteerEvent = require("../models/volunteerevent");
const { addPoints } = require("../utils/gamification");

// ================= LIST =================
router.get("/volunteer/events", requireAuth, async (req, res) => {
  const events = await VolunteerEvent.find({}).sort({ date: 1 }).limit(50);
  return res.json({ events });
});

// ================= CREATE =================
router.post("/volunteer/events", requireAuth, async (req, res) => {
  try {
    const { title, description, date } = req.body;
    if (!title || !date) return res.status(400).json({ message: "title and date are required" });

    const event = await VolunteerEvent.create({
      title: String(title).trim(),
      description: description ? String(description) : "",
      date: new Date(date),
      participants: [],
      createdBy: req.user._id,
    });

    addPoints(req.user, 5, { reason: "Created volunteer event" });
    await req.user.save();

    return res.status(201).json({ message: "Event created", event });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= JOIN =================
router.post("/volunteer/events/:id/join", requireAuth, async (req, res) => {
  try {
    const event = await VolunteerEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const already = event.participants.some((u) => String(u) === String(req.user._id));
    if (!already) event.participants.push(req.user._id);
    await event.save();

    addPoints(req.user, 6, { reason: "Joined volunteer event" });
    await req.user.save();

    return res.json({ message: "Joined volunteer event", event });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin remove
router.post("/volunteer/events/:id/admin/remove", requireAuth, requireAdmin, async (req, res) => {
  const event = await VolunteerEvent.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  await event.deleteOne();
  return res.json({ message: "Event removed" });
});

module.exports = router;

