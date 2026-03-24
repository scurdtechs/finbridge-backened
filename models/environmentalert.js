const mongoose = require("mongoose");

const environmentAlertSchema = new mongoose.Schema(
  {
    type: { type: String, default: "environment", trim: true }, // e.g. air_quality, temperature
    value: { type: Number, default: 0 },
    unit: { type: String, default: "" },
    location: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EnvironmentAlert", environmentAlertSchema);

