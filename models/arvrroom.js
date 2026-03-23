const mongoose = require("mongoose");

const virtualMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const arvrRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    participants: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    virtualMaterials: { type: [virtualMaterialSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ARVRRoom", arvrRoomSchema);

