const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const Attendance = require("../models/attendance");
const EnvironmentAlert = require("../models/environmentalert");
const { addPoints } = require("../utils/gamification");

// ================= ATTENDANCE =================
router.post("/campus/attendance/check-in", requireAuth, async (req, res) => {
  try {
    const { location, status } = req.body;
    const entry = await Attendance.create({
      userId: req.user._id,
      location: location ? String(location) : "",
      status: status ? String(status) : "present",
      checkInAt: new Date(),
    });

    addPoints(req.user, 3, { reason: "Campus check-in" });
    await req.user.save();

    return res.status(201).json({ message: "Checked in", entry });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/campus/attendance/mine", requireAuth, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const entries = await Attendance.find({ userId: req.user._id }).sort({ checkInAt: -1 }).limit(Math.max(1, limit));
  return res.json({ entries });
});

// ================= ENVIRONMENT ALERTS =================
router.get("/campus/environment-alerts", requireAuth, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const alerts = await EnvironmentAlert.find({}).sort({ createdAt: -1 }).limit(Math.max(1, limit));
  return res.json({ alerts });
});

router.post("/campus/environment-alerts/admin/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, value, unit, location } = req.body;
    if (value === undefined) return res.status(400).json({ message: "value is required" });

    const alert = await EnvironmentAlert.create({
      type: type ? String(type) : "environment",
      value: Number(value),
      unit: unit ? String(unit) : "",
      location: location ? String(location) : "",
      createdBy: req.user._id,
    });

    return res.status(201).json({ message: "Alert created", alert });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

