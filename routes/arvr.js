const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const LibraryMaterial = require("../models/librarymaterial");
const ARVRRoom = require("../models/arvrroom");

// Virtual library tours: return offline-available library materials + AR rooms
router.get("/arvr/virtual-library-tours", requireAuth, async (req, res) => {
  try {
    const rooms = await ARVRRoom.find({}).sort({ createdAt: -1 }).limit(20);
    const materials = await LibraryMaterial.find({ offlineAvailable: true }).sort({ createdAt: -1 }).limit(50);
    return res.json({ rooms, materials });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

