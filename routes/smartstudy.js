const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const SmartStudySession = require("../models/smartstudysession");

// ================= FOCUS / POMODORO SESSIONS =================
router.post("/smartstudy/sessions", requireAuth, async (req, res) => {
  try {
    const { type, durationSeconds, metadata } = req.body;
    const session = await SmartStudySession.create({
      userId: req.user._id,
      type: type ? String(type) : "focus",
      durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : 0,
      startedAt: new Date(),
      completedAt: null,
      metadata: metadata || undefined,
    });
    return res.status(201).json({ message: "Session started", session });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/smartstudy/sessions/:sessionId/complete", requireAuth, async (req, res) => {
  try {
    const session = await SmartStudySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (String(session.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    session.completedAt = new Date();
    await session.save();
    return res.json({ message: "Session completed", session });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/smartstudy/sessions", requireAuth, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const sessions = await SmartStudySession.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(Math.max(1, limit));
  return res.json({ sessions });
});

// ================= COMPANION SUGGESTIONS (LIGHTWEIGHT) =================
router.get("/companion/suggestions", requireAuth, async (req, res) => {
  const suggestions = [
    "Do one quiz question now, then take a 3-minute break.",
    "Log your mood today to keep your progress honest.",
    "Try a 10-minute focus sprint and mark it complete.",
  ];
  return res.json({ suggestions });
});

module.exports = router;

