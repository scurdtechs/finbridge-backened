const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    value: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const libraryMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, default: "" },
    url: { type: String, default: "" }, // pdf url or resource url
    ratings: { type: [ratingSchema], default: [] },
    category: { type: String, default: "" },
    offlineAvailable: { type: Boolean, default: false },

    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LibraryMaterial", libraryMaterialSchema);

