const mongoose = require("mongoose");

const entertainmentItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // media | music | gaming
    category: { type: String, enum: ["media", "music", "gaming"], default: "media" },

    mediaType: { type: String, default: "" }, // image | video
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    url: { type: String, default: "" }, // image/video/audio link

    participants: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },

    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    comments: { type: [{ userId: mongoose.Schema.Types.ObjectId, comment: String, createdAt: Date }], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EntertainmentItem", entertainmentItemSchema);

