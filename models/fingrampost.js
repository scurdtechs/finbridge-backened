const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    comment: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const finGramPostSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, default: "" },
    media: { type: [String], default: [] },

    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    comments: { type: [commentSchema], default: [] },

    hashtags: { type: [String], default: [] },

    // Stories are modeled as short-lived posts
    isStory: { type: Boolean, default: false },
    storyExpiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinGramPost", finGramPostSchema);

