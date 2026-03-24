const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const Event = require("../models/event");
const Transaction = require("../models/transaction");
const { addPoints } = require("../utils/gamification");

// ================= LIST EVENTS =================
router.get("/events", requireAuth, async (req, res) => {
  const { type } = req.query;
  const filter = {};
  if (type) filter.type = String(type);
  const events = await Event.find(filter).sort({ date: 1 });
  return res.json({ events });
});

// ================= CREATE EVENT =================
router.post("/events", requireAuth, async (req, res) => {
  try {
    const { title, description, date, location, fee, ARavailable, type, streamUrl } = req.body;
    if (!title || !date) return res.status(400).json({ message: "title and date are required" });

    const event = await Event.create({
      title: String(title).trim(),
      description: description ? String(description) : "",
      date: new Date(date),
      location: location ? String(location) : "",
      fee: fee !== undefined ? Number(fee) : 0,
      ARavailable: ARavailable === true || ARavailable === "true",
      createdBy: req.user._id,
      attendees: [],
      type: type ? String(type) : "workshop",
      streamUrl: streamUrl ? String(streamUrl) : "",
    });

    return res.status(201).json({ message: "Event created", event });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= RSVP =================
router.post("/events/:id/rsvp", requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const already = event.attendees.some((id) => String(id) === String(req.user._id));
    if (already) return res.json({ message: "Already RSVP'd", event });

    event.attendees.push(req.user._id);
    await event.save();
    addPoints(req.user, 5, { reason: `RSVP: ${event.title}` });
    await req.user.save();
    return res.json({ message: "RSVP successful", event });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= TICKET PAYMENT (IF FEE > 0) =================
router.post("/events/:id/ticket-pay", requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const fee = Number(event.fee || 0);
    if (fee <= 0) {
      return res.json({ message: "Event is free", event });
    }

    // Simple wallet deduction: since we have no separate Event owner wallet,
    // we credit createdBy user's balance.
    const buyer = req.user;
    if (buyer.balance < fee) return res.status(400).json({ message: "Insufficient balance" });

    const seller = await require("../models/user").findById(event.createdBy);
    if (!seller) return res.status(404).json({ message: "Event organizer not found" });

    buyer.balance -= fee;
    seller.balance += fee;
    await buyer.save();
    await seller.save();

    // Add attendee after payment
    const already = event.attendees.some((id) => String(id) === String(req.user._id));
    if (!already) event.attendees.push(req.user._id);
    await event.save();

    await Transaction.create({
      type: "microtransaction",
      senderPhone: buyer.phone,
      receiverPhone: seller.phone,
      amount: fee,
      meta: { eventId: String(event._id) },
    });

    addPoints(buyer, 20, { reason: "Paid event ticket" });
    await buyer.save();

    return res.json({ message: "Ticket paid", event });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: remove event
router.post("/events/:id/admin/remove", requireAuth, requireAdmin, async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  await event.deleteOne();
  return res.json({ message: "Event removed" });
});

module.exports = router;

