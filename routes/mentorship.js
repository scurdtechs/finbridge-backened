const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const Mentor = require("../models/mentor");
const MentorshipRequest = require("../models/mentorshiprequest");
const MentorMessage = require("../models/mentormessage");

// ================= LIST MENTORS =================
router.get("/mentorship/mentors", requireAuth, async (req, res) => {
  const mentors = await Mentor.find({}).sort({ createdAt: -1 });
  return res.json({ mentors });
});

// ================= REQUEST CHAT =================
router.post("/mentorship/requests/:mentorId/request-chat", requireAuth, async (req, res) => {
  try {
    const mentorId = req.params.mentorId;
    const mentor = await Mentor.findById(mentorId);
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });

    // Prevent duplicates pending
    const existing = await MentorshipRequest.findOne({
      userId: req.user._id,
      mentorId,
      status: { $in: ["pending"] },
    });
    if (existing) return res.status(200).json({ message: "Request already pending", request: existing });

    const request = await MentorshipRequest.create({
      userId: req.user._id,
      mentorId,
      status: "pending",
    });

    return res.status(201).json({ message: "Chat requested", request });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= SCHEDULE =================
router.post("/mentorship/requests/:requestId/schedule", requireAuth, async (req, res) => {
  try {
    const request = await MentorshipRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    const { scheduledAt, notes } = req.body;
    if (!scheduledAt) return res.status(400).json({ message: "scheduledAt is required" });

    request.scheduledAt = new Date(scheduledAt);
    request.notes = notes ? String(notes) : request.notes;
    request.status = request.status === "declined" ? "pending" : request.status;

    await request.save();
    return res.json({ message: "Scheduled", request });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= MESSAGES =================
router.get("/mentorship/requests/mine", requireAuth, async (req, res) => {
  const requests = await MentorshipRequest.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  return res.json({ requests });
});

router.post("/mentorship/requests/:requestId/message", requireAuth, async (req, res) => {
  try {
    const request = await MentorshipRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "content is required" });

    const msg = await MentorMessage.create({
      requestId: request._id,
      senderId: req.user._id,
      content: String(content).trim(),
      fromMentor: false,
    });

    return res.status(201).json({ message: "Message sent", msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/mentorship/requests/:requestId/messages", requireAuth, async (req, res) => {
  const request = await MentorshipRequest.findById(req.params.requestId);
  if (!request) return res.status(404).json({ message: "Request not found" });
  if (String(request.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

  const messages = await MentorMessage.find({ requestId: request._id }).sort({ createdAt: 1 }).limit(200);
  return res.json({ messages });
});

// ---------------- ADMIN: create mentors ----------------
router.post("/mentorship/mentors/admin/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, expertise, contact } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const mentor = await Mentor.create({
      name: String(name).trim(),
      expertise: Array.isArray(expertise) ? expertise.map((e) => String(e)) : [],
      contact: contact ? String(contact) : "",
    });
    return res.status(201).json({ message: "Mentor created", mentor });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

