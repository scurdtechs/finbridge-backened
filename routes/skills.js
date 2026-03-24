const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const SkillListing = require("../models/skilllisting");
const SkillBooking = require("../models/skillbooking");
const User = require("../models/user");
const { addPoints } = require("../utils/gamification");

// ================= LIST SKILL LISTINGS =================
router.get("/skills/listings", requireAuth, async (req, res) => {
  const category = req.query.category ? String(req.query.category) : null;
  const filter = { status: "available" };
  if (category) filter.category = category;
  const listings = await SkillListing.find(filter).sort({ createdAt: -1 }).limit(50);
  return res.json({ listings });
});

// ================= CREATE LISTING =================
router.post("/skills/listings", requireAuth, async (req, res) => {
  try {
    const { title, description, category, price, media } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    const listing = await SkillListing.create({
      title: String(title).trim(),
      description: description ? String(description) : "",
      category: category ? String(category) : "",
      price: price !== undefined ? Number(price) : 0,
      owner: req.user._id,
      media: Array.isArray(media) ? media : [],
      status: "available",
    });

    addPoints(req.user, 4, { reason: "Created a skill listing" });
    await req.user.save();

    return res.status(201).json({ message: "Listing created", listing });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= REQUEST/BOOK =================
router.post("/skills/listings/:id/book", requireAuth, async (req, res) => {
  try {
    const listing = await SkillListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.status !== "available") return res.status(400).json({ message: "Listing not available" });
    if (String(listing.owner) === String(req.user._id)) return res.status(400).json({ message: "Cannot book your own listing" });

    const booking = await SkillBooking.create({
      listingId: listing._id,
      userId: req.user._id,
      ownerId: listing.owner,
      status: "pending",
      notes: req.body.notes ? String(req.body.notes) : "",
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
    });

    addPoints(req.user, 6, { reason: "Booked a skill session" });
    await req.user.save();

    return res.status(201).json({ message: "Booking requested", booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= MY BOOKINGS =================
router.get("/skills/bookings/mine", requireAuth, async (req, res) => {
  const bookings = await SkillBooking.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  return res.json({ bookings });
});

// ================= OWNER BOOKINGS (OPTIONAL) =================
router.get("/skills/bookings/owner/mine", requireAuth, async (req, res) => {
  const bookings = await SkillBooking.find({ ownerId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  return res.json({ bookings });
});

// ================= ADMIN UPDATE BOOKING =================
router.post("/skills/bookings/:id/admin/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const booking = await SkillBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const status = req.body.status ? String(req.body.status) : "";
    if (!["pending", "accepted", "declined", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    booking.status = status;
    await booking.save();
    return res.json({ message: "Updated", booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

