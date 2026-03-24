const mongoose = require("mongoose");

const skillBookingSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "SkillListing", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestedAt: { type: Date, default: Date.now },
    scheduledAt: { type: Date },
    status: { type: String, enum: ["pending", "accepted", "declined", "completed"], default: "pending", index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillBooking", skillBookingSchema);

