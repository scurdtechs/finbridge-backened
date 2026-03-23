const mongoose = require("mongoose");

const deviceSharingSchema = new mongoose.Schema(
  {
    itemType: { type: String, required: true, trim: true }, // laptop/phone/tablet/etc
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["requested", "accepted", "declined", "returned"], default: "requested", index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeviceSharing", deviceSharingSchema);

