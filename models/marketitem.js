const mongoose = require("mongoose");

const marketItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, default: "" },
    status: { type: String, enum: ["available", "sold", "removed"], default: "available" },

    images: { type: [String], default: [] },

    // When sold
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    soldAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarketItem", marketItemSchema);

