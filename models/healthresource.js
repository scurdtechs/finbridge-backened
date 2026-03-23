const mongoose = require("mongoose");

const healthResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "mental-health", trim: true },
    url: { type: String, default: "" },
    description: { type: String, default: "" },
    offlineAvailable: { type: Boolean, default: false },
    // In a real system this might be linked to an admin uploader
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model("HealthResource", healthResourceSchema);

