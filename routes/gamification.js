const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const User = require("../models/user");

// leaderboard: top users by points
router.get("/gamification/leaderboard", requireAuth, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const users = await User.find({})
    .select("name phone points badges")
    .sort({ points: -1 })
    .limit(Math.max(1, limit));
  return res.json({ users });
});

// today status for current user
router.get("/gamification/daily-challenge/today", requireAuth, async (req, res) => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const dateKey = `${y}-${m}-${d}`;

  const me = req.user;

  const today = (me.dailyChallenges || []).find((x) => x.dateKey === dateKey) || null;

  // Static task types for now (we mark completion when actions run)
  const tasks = [
    { type: "log_mood", label: "Log your mood", rewardPoints: 5 },
    { type: "complete_quiz", label: "Submit a quiz", rewardPoints: 10 },
    { type: "bookmark_library", label: "Bookmark a library item", rewardPoints: 7 },
  ];

  const completed = today ? today.completedTasks || [] : [];
  const mapped = tasks.map((t) => ({
    ...t,
    completed: completed.includes(t.type),
  }));

  return res.json({ dateKey, tasks: mapped, rewarded: today ? Boolean(today.rewarded) : false });
});

module.exports = router;

