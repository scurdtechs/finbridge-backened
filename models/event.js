const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true, index: true },
    location: { type: String, default: "" },
    fee: { type: Number, default: 0, min: 0 },
    attendees: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ARavailable: { type: Boolean, default: false },
    type: { type: String, default: "workshop" }, // workshop/webinar/live/AR etc
    streamUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);

