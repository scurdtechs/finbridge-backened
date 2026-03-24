const mongoose = require("mongoose");

const groupPostSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    media: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    members: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
    posts: { type: [groupPostSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);

