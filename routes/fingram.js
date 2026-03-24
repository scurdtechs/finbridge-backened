const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const FinGramPost = require("../models/fingrampost");
const User = require("../models/user");
const { addPoints } = require("../utils/gamification");

function uniqHashtags(tags) {
  const set = new Set();
  for (const t of tags) {
    const normalized = String(t || "").trim().replace(/^#/, "");
    if (normalized) set.add(normalized);
  }
  return [...set];
}

// ================= POSTS LIST =================
router.get("/social/posts", requireAuth, async (req, res) => {
  const { hashtag } = req.query;
  const filter = {};
  if (hashtag) filter.hashtags = { $in: [String(hashtag).replace(/^#/, "")] };
  filter.isStory = false; // keep stories separate

  const posts = await FinGramPost.find(filter).sort({ createdAt: -1 }).limit(50);
  return res.json({ posts });
});

// ================= CREATE POST =================
router.post("/social/posts", requireAuth, async (req, res) => {
  try {
    const { content, media, hashtags, isStory, storyExpiresAt } = req.body;
    if (!content && !(media && Array.isArray(media) && media.length)) {
      return res.status(400).json({ message: "content or media is required" });
    }

    const extractedTags = Array.isArray(hashtags)
      ? uniqHashtags(hashtags)
      : typeof hashtags === "string" && hashtags.trim()
        ? uniqHashtags(hashtags.split(","))
        : [];

    const post = await FinGramPost.create({
      userId: req.user._id,
      content: content ? String(content) : "",
      media: Array.isArray(media) ? media : [],
      hashtags: extractedTags,
      isStory: Boolean(isStory),
      storyExpiresAt: storyExpiresAt ? new Date(storyExpiresAt) : undefined,
    });

    addPoints(req.user, 5, { reason: "Created a FinGram post" });
    await req.user.save();

    return res.status(201).json({ message: "Post created", post });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= LIKE TOGGLE =================
router.post("/social/posts/:id/like", requireAuth, async (req, res) => {
  const post = await FinGramPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const idx = post.likes.findIndex((id) => String(id) === String(req.user._id));
  if (idx >= 0) post.likes.splice(idx, 1);
  else post.likes.push(req.user._id);

  await post.save();
  addPoints(req.user, 1, { reason: idx >= 0 ? "Removed like" : "Liked a post" });
  await req.user.save();
  return res.json({ message: "Like updated", likesCount: post.likes.length, liked: idx < 0 });
});

// ================= ADD COMMENT =================
router.post("/social/posts/:id/comment", requireAuth, async (req, res) => {
  const post = await FinGramPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const { comment } = req.body;
  if (!comment) return res.status(400).json({ message: "comment is required" });

  post.comments.push({ userId: req.user._id, comment: String(comment), createdAt: new Date() });
  await post.save();
  addPoints(req.user, 2, { reason: "Commented on a post" });
  await req.user.save();
  return res.status(201).json({ message: "Comment added", commentsCount: post.comments.length });
});

// ================= FOLLOW/UNFOLLOW =================
router.post("/social/follow/:targetUserId", requireAuth, async (req, res) => {
  const targetUserId = req.params.targetUserId;
  if (String(targetUserId) === String(req.user._id)) return res.status(400).json({ message: "Cannot follow yourself" });

  const target = await User.findById(targetUserId);
  if (!target) return res.status(404).json({ message: "Target user not found" });

  const isFollowing = req.user.following.some((id) => String(id) === String(targetUserId));
  if (isFollowing) {
    req.user.following = req.user.following.filter((id) => String(id) !== String(targetUserId));
    target.followers = target.followers.filter((id) => String(id) !== String(req.user._id));
    await req.user.save();
    await target.save();
    addPoints(req.user, 0.5, { reason: "Unfollowed a user" });
    await req.user.save();
    return res.json({ message: "Unfollowed" });
  }

  req.user.following.push(targetUserId);
  target.followers.push(req.user._id);
  await req.user.save();
  await target.save();
  addPoints(req.user, 2, { reason: "Followed a user" });
  await req.user.save();
  return res.json({ message: "Followed" });
});

// ================= STORIES (LIST) =================
router.get("/social/stories", requireAuth, async (req, res) => {
  const now = new Date();
  const stories = await FinGramPost.find({
    isStory: true,
    $or: [{ storyExpiresAt: { $exists: false } }, { storyExpiresAt: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json({ stories });
});

// ================= HASHTAGS =================
router.get("/social/hashtags/:tag", requireAuth, async (req, res) => {
  const tag = String(req.params.tag || "").replace(/^#/, "");
  const posts = await FinGramPost.find({ hashtags: { $in: [tag] }, isStory: false })
    .sort({ createdAt: -1 })
    .limit(50);
  return res.json({ posts });
});

module.exports = router;

