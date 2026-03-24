const mongoose = require("mongoose");

const fitnessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    activityType: { type: String, default: "fitness", trim: true },
    steps: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FitnessLog", fitnessLogSchema);

