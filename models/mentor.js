const mongoose = require("mongoose");

const mentorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    expertise: { type: [String], default: [] },
    contact: { type: String, default: "" }, // phone/email/handle
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mentor", mentorSchema);

