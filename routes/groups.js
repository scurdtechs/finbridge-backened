const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const Group = require("../models/group");
const Poll = require("../models/poll");
const { addPoints } = require("../utils/gamification");

// ================= CREATE GROUP =================
router.post("/groups", requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const group = await Group.create({
      name: String(name).trim(),
      description: description ? String(description) : "",
      members: [req.user._id],
      posts: [],
    });

    return res.status(201).json({ message: "Group created", group });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= LIST GROUPS =================
router.get("/groups", requireAuth, async (req, res) => {
  const groups = await Group.find({}).sort({ createdAt: -1 }).limit(50);
  return res.json({ groups });
});

// ================= JOIN GROUP =================
router.post("/groups/:groupId/join", requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const already = group.members.some((id) => String(id) === String(req.user._id));
    if (already) return res.json({ message: "Already a member", group });

    group.members.push(req.user._id);
    await group.save();
    return res.json({ message: "Joined group", group });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

function isMember(group, userId) {
  return group.members.some((id) => String(id) === String(userId));
}

// ================= GROUP POSTS =================
router.post("/groups/:groupId/posts", requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, req.user._id)) return res.status(403).json({ message: "Join group to post" });

    const { content, media } = req.body;
    if (!content) return res.status(400).json({ message: "content is required" });

    group.posts.push({
      authorId: req.user._id,
      content: String(content),
      media: Array.isArray(media) ? media : [],
      createdAt: new Date(),
    });

    await group.save();
    addPoints(req.user, 5, { reason: "Posted in a group" });
    await req.user.save();
    return res.status(201).json({ message: "Post added", postsCount: group.posts.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/groups/:groupId/posts", requireAuth, async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  return res.json({ posts: group.posts || [] });
});

// ================= POLLS =================
router.post("/groups/:groupId/polls", requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!isMember(group, req.user._id)) return res.status(403).json({ message: "Join group to create polls" });

    const { question, options } = req.body;
    if (!question) return res.status(400).json({ message: "question is required" });
    const opt = Array.isArray(options) ? options.map((o) => String(o)) : [];
    if (opt.length < 2) return res.status(400).json({ message: "options must be an array with >= 2 entries" });

    const poll = await Poll.create({
      groupId: group._id,
      question: String(question).trim(),
      options: opt,
      votes: [],
    });

    return res.status(201).json({ message: "Poll created", poll });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/groups/:groupId/polls", requireAuth, async (req, res) => {
  const polls = await Poll.find({ groupId: req.params.groupId }).sort({ createdAt: -1 }).limit(50);
  return res.json({ polls });
});

function countVotes(poll) {
  const totals = new Array(poll.options.length).fill(0);
  for (const v of poll.votes || []) {
    const idx = Number(v.optionIndex);
    if (idx >= 0 && idx < totals.length) totals[idx] += 1;
  }
  return totals;
}

router.post("/polls/:pollId/vote", requireAuth, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const optionIndex = Number(req.body.optionIndex);
    if (!Number.isFinite(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: "Invalid optionIndex" });
    }

    // Upsert vote per user (toggle/replace)
    const existingIdx = poll.votes.findIndex((v) => String(v.userId) === String(req.user._id));
    if (existingIdx >= 0) {
      const existing = poll.votes[existingIdx];
      if (existing.optionIndex === optionIndex) {
        // toggle off
        poll.votes.splice(existingIdx, 1);
      } else {
        poll.votes[existingIdx].optionIndex = optionIndex;
      }
    } else {
      poll.votes.push({ userId: req.user._id, optionIndex });
    }

    await poll.save();
    addPoints(req.user, 1, { reason: "Voted in a poll" });
    await req.user.save();
    return res.json({ message: "Vote recorded", totals: countVotes(poll), votesCount: poll.votes.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= TRENDING (SIMPLE) =================
router.get("/community/trending", requireAuth, async (req, res) => {
  const groups = await Group.find({}).limit(50);
  const polls = await Poll.find({}).limit(200);

  const groupScores = groups.map((g) => ({
    groupId: g._id,
    name: g.name,
    postsCount: (g.posts || []).length,
    pollCount: polls.filter((p) => String(p.groupId) === String(g._id)).length,
  }));

  return res.json({ trending: groupScores.sort((a, b) => b.postsCount - a.postsCount).slice(0, 10) });
});

// Admin: remove group
router.post("/groups/:groupId/admin/remove", requireAuth, requireAdmin, async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  await group.deleteOne();
  return res.json({ message: "Group removed" });
});

module.exports = router;

