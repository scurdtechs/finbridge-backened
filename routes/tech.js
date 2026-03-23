const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const DeviceSharing = require("../models/devicesharing");
const SmartLocker = require("../models/smartlocker");
const ARVRRoom = require("../models/arvrroom");

// ================= DEVICE SHARING =================
router.post("/tech/device-sharing/request", requireAuth, async (req, res) => {
  try {
    const { itemType, ownerId } = req.body;
    if (!itemType || !ownerId) return res.status(400).json({ message: "itemType and ownerId are required" });

    if (String(ownerId) === String(req.user._id)) return res.status(400).json({ message: "Cannot request your own device" });

    const request = await DeviceSharing.create({
      itemType: String(itemType).trim(),
      owner: ownerId,
      borrower: req.user._id,
      status: "requested",
      notes: req.body.notes ? String(req.body.notes) : "",
    });

    return res.status(201).json({ message: "Request created", request });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/tech/device-sharing/mine", requireAuth, async (req, res) => {
  const requests = await DeviceSharing.find({
    $or: [{ borrower: req.user._id }, { owner: req.user._id }],
  }).sort({ createdAt: -1 });
  return res.json({ requests });
});

router.post("/tech/device-sharing/:id/approve", requireAuth, async (req, res) => {
  try {
    const reqDoc = await DeviceSharing.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (String(reqDoc.owner) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    reqDoc.status = "accepted";
    await reqDoc.save();
    return res.json({ message: "Approved", request: reqDoc });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/tech/device-sharing/:id/decline", requireAuth, async (req, res) => {
  try {
    const reqDoc = await DeviceSharing.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (String(reqDoc.owner) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    reqDoc.status = "declined";
    await reqDoc.save();
    return res.json({ message: "Declined", request: reqDoc });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/tech/device-sharing/:id/return", requireAuth, async (req, res) => {
  try {
    const reqDoc = await DeviceSharing.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (![reqDoc.owner, reqDoc.borrower].some((id) => String(id) === String(req.user._id))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    reqDoc.status = "returned";
    await reqDoc.save();
    return res.json({ message: "Returned", request: reqDoc });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= SMART LOCKERS =================
router.post("/tech/smart-lockers/admin/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { lockerId } = req.body;
    if (!lockerId) return res.status(400).json({ message: "lockerId is required" });
    const locker = await SmartLocker.create({ lockerId: String(lockerId).trim(), assignedUser: null, accessLogs: [] });
    return res.status(201).json({ message: "Locker created", locker });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/tech/smart-lockers/:lockerId/assign", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { assignedUserId } = req.body;
    if (!assignedUserId) return res.status(400).json({ message: "assignedUserId is required" });
    const locker = await SmartLocker.findOne({ lockerId: req.params.lockerId });
    if (!locker) return res.status(404).json({ message: "Locker not found" });

    locker.assignedUser = assignedUserId;
    await locker.save();
    return res.json({ message: "Assigned", locker });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/tech/smart-lockers/:lockerId/access", requireAuth, async (req, res) => {
  try {
    const locker = await SmartLocker.findOne({ lockerId: req.params.lockerId });
    if (!locker) return res.status(404).json({ message: "Locker not found" });

    const success = locker.assignedUser && String(locker.assignedUser) === String(req.user._id);
    locker.accessLogs.push({
      userId: req.user._id,
      at: new Date(),
      success,
      note: req.body.note ? String(req.body.note) : "",
    });
    await locker.save();

    return res.json({ message: success ? "Access granted" : "Access denied", success, locker });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= AR/VR ROOMS =================
router.get("/tech/arvr-rooms", requireAuth, async (req, res) => {
  const rooms = await ARVRRoom.find({}).sort({ createdAt: -1 }).limit(50);
  return res.json({ rooms });
});

router.post("/tech/arvr-rooms/admin/create", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const room = await ARVRRoom.create({
      roomId: String(roomId).trim(),
      participants: [],
      virtualMaterials: [],
    });

    return res.status(201).json({ message: "Room created", room });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/tech/arvr-rooms/:roomId/join", requireAuth, async (req, res) => {
  try {
    const room = await ARVRRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    const already = room.participants.some((id) => String(id) === String(req.user._id));
    if (!already) room.participants.push(req.user._id);
    await room.save();

    return res.json({ message: "Joined room", room });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/tech/arvr-rooms/:roomId/materials", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });
    const room = await ARVRRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });

    room.virtualMaterials.push({ title: String(title).trim(), url: url ? String(url) : "" });
    await room.save();
    return res.status(201).json({ message: "Material added", room });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

