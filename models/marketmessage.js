const mongoose = require("mongoose");

const marketMessageSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", required: true, index: true },
    content: { type: String, required: true, trim: true },
    readBySeller: { type: Boolean, default: false },
    readByBuyer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarketMessage", marketMessageSchema);

