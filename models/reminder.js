const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    task: { type: String, required: true, trim: true },
    remindAt: { type: Date, required: true, index: true },
    message: { type: String, default: "" },
    delivered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);

