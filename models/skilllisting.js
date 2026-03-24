const mongoose = require("mongoose");

const skillListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 }, // optional
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["available", "booked", "removed"], default: "available" },
    media: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillListing", skillListingSchema);

