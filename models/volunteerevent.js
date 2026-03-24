const mongoose = require("mongoose");

const volunteereventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true, index: true },
    participants: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VolunteerEvent", volunteereventSchema);

