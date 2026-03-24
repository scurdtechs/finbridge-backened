const mongoose = require("mongoose");

const mentorshipRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true, index: true },

    status: { type: String, enum: ["pending", "accepted", "declined", "completed"], default: "pending", index: true },

    scheduledAt: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MentorshipRequest", mentorshipRequestSchema);

