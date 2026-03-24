const mongoose = require("mongoose");

const repaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const loanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    amount: { type: Number, required: true },
    interest: { type: Number, default: 0 }, // percent

    status: {
      type: String,
      enum: ["pending", "approved", "declined", "repaid"],
      default: "pending",
      index: true,
    },

    totalToRepay: { type: Number, default: 0 },
    dueDate: { type: Date },
    penalties: { type: Number, default: 0 },

    repaymentHistory: { type: [repaymentSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);

