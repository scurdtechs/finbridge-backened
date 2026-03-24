const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const Lab = require("../models/lab");
const LabReservation = require("../models/labreservation");
const { addPoints } = require("../utils/gamification");

// ================= LIST LABS =================
router.get("/labs", requireAuth, async (req, res) => {
  const labs = await Lab.find({}).sort({ createdAt: -1 }).limit(50);
  return res.json({ labs });
});

// ================= ADMIN CREATE LAB =================
router.post("/labs/admin/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, location, capacity } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const lab = await Lab.create({
      name: String(name).trim(),
      location: location ? String(location) : "",
      capacity: capacity !== undefined ? Number(capacity) : 1,
      createdBy: req.user._id,
    });
    return res.status(201).json({ message: "Lab created", lab });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= CREATE RESERVATION =================
router.post("/labs/reservations", requireAuth, async (req, res) => {
  try {
    const { labId, startAt, endAt, notes } = req.body;
    if (!labId || !startAt || !endAt) return res.status(400).json({ message: "labId, startAt, endAt are required" });

    const lab = await Lab.findById(labId);
    if (!lab) return res.status(404).json({ message: "Lab not found" });

    // Basic overlap check
    const start = new Date(startAt);
    const end = new Date(endAt);
    const overlaps = await LabReservation.find({
      labId: lab._id,
      status: "reserved",
      $or: [
        { startAt: { $lt: end }, endAt: { $gt: start } },
      ],
    });
    if (overlaps.length >= (lab.capacity || 1)) {
      return res.status(400).json({ message: "Lab is fully booked for that time" });
    }

    const reservation = await LabReservation.create({
      labId: lab._id,
      userId: req.user._id,
      startAt: start,
      endAt: end,
      status: "reserved",
    });

    addPoints(req.user, 7, { reason: "Reserved a shared lab" });
    await req.user.save();

    return res.status(201).json({ message: "Reservation created", reservation });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= MY RESERVATIONS =================
router.get("/labs/reservations/mine", requireAuth, async (req, res) => {
  const reservations = await LabReservation.find({ userId: req.user._id }).sort({ startAt: -1 }).limit(100);
  return res.json({ reservations });
});

router.post("/labs/reservations/:id/cancel", requireAuth, async (req, res) => {
  const reservation = await LabReservation.findById(req.params.id);
  if (!reservation) return res.status(404).json({ message: "Reservation not found" });
  if (String(reservation.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  reservation.status = "cancelled";
  await reservation.save();
  return res.json({ message: "Cancelled", reservation });
});

module.exports = router;

