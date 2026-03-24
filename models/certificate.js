const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    issuedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicates: one certificate per user/course
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Certificate", certificateSchema);

