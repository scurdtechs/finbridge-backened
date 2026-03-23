const mongoose = require("mongoose");

const quizScoreSchema = new mongoose.Schema(
  {
    quizTitle: { type: String, default: "" },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const enrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },

    completedLessons: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 },

    quizScores: { type: [quizScoreSchema], default: [] },
    rewardsEarned: { type: Number, default: 0 },

    progressUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);

