const mongoose = require("mongoose");

const pollVoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    optionIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", index: true },
    question: { type: String, required: true, trim: true },
    options: { type: [String], required: true, validate: [(v) => v.length >= 2, "At least 2 options are required"] },
    votes: { type: [pollVoteSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Poll", pollSchema);

