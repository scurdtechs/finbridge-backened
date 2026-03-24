const mongoose = require("mongoose");

const forumPostSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    media: { type: [String], default: [] }, // image/video URLs
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Progress tracking is stored primarily in Enrollment, but keep knobs here too
    totalLessons: { type: Number, default: 0 },

    offlineContent: { type: [String], default: [] }, // URLs or identifiers for offline use

    // Course forum is embedded for now to keep the data model aligned with `courses`
    forumPosts: { type: [forumPostSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);

