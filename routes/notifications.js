const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");

// notifications are embedded in User.notifications
router.get("/notifications", requireAuth, async (req, res) => {
  const user = req.user;
  const notifications = (user.notifications || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  return res.json({ notifications });
});

router.post("/notifications/:index/mark-read", requireAuth, async (req, res) => {
  const user = req.user;
  const idx = Number(req.params.index);
  if (!Number.isFinite(idx) || idx < 0 || idx >= (user.notifications || []).length) {
    return res.status(400).json({ message: "Invalid notification index" });
  }
  user.notifications[idx].read = true;
  await user.save();
  return res.json({ message: "Marked read" });
});

router.post("/notifications/clear-read", requireAuth, async (req, res) => {
  const user = req.user;
  user.notifications = (user.notifications || []).filter((n) => !n.read);
  await user.save();
  return res.json({ message: "Cleared read notifications", notifications: user.notifications });
});

module.exports = router;

