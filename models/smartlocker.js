const mongoose = require("mongoose");

const accessLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
    success: { type: Boolean, default: false },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const smartLockerSchema = new mongoose.Schema(
  {
    lockerId: { type: String, required: true, unique: true, index: true },
    assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    accessLogs: { type: [accessLogSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SmartLocker", smartLockerSchema);

