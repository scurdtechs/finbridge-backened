const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    task: { type: String, required: true, trim: true },

    // Progress as a percentage 0-100
    progress: { type: Number, default: 0, min: 0, max: 100 },

    // Optional scheduling
    remindAt: { type: Date },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Habit", habitSchema);

