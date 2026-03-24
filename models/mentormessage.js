const mongoose = require("mongoose");

const mentorMessageSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "MentorshipRequest", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true },
    // For simplicity, messages are stored only from the user; mentor system replies can be added later.
    fromMentor: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MentorMessage", mentorMessageSchema);

