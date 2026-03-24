const mongoose = require("mongoose");

const labReservationSchema = new mongoose.Schema(
  {
    labId: { type: mongoose.Schema.Types.ObjectId, ref: "Lab", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    status: { type: String, enum: ["reserved", "cancelled", "completed"], default: "reserved", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabReservation", labReservationSchema);

