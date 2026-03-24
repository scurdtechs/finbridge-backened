const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["deposit", "send", "split", "microtransaction", "tap-to-pay", "received"],
      default: "send",
    },
    senderPhone: { type: String, default: "" },
    receiverPhone: { type: String, default: "" },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);

