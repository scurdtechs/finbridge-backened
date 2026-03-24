const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    checkInAt: { type: Date, default: Date.now },
    location: { type: String, default: "" },
    status: { type: String, enum: ["present", "absent", "late"], default: "present" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);

