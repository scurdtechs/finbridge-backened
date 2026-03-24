const mongoose = require("mongoose");

const moodLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mood: { type: String, required: true, trim: true }, // e.g. happy/sad/anxious
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MoodLog", moodLogSchema);

