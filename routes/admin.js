const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const User = require("../models/user");
const Loan = require("../models/loan");
const LibraryMaterial = require("../models/librarymaterial");
const Event = require("../models/event");

// ================= VIEW USERS =================
router.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await User.find({})
    .select("name email phone balance points isAdmin isSuspended role")
    .limit(200);
  return res.json({ users });
});

// ================= SUSPEND / UNSUSPEND =================
router.post("/admin/users/:id/suspend", requireAuth, requireAdmin, async (req, res) => {
  const { suspended } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isSuspended = suspended === true || suspended === "true";
  user.suspendedAt = user.isSuspended ? new Date() : undefined;
  await user.save();

  return res.json({ message: "User updated", user: { id: user._id, isSuspended: user.isSuspended } });
});

// ================= ANALYTICS (SIMPLE) =================
router.get("/admin/analytics", requireAuth, requireAdmin, async (req, res) => {
  const [userCount, loanCount, libraryCount, eventCount] = await Promise.all([
    User.countDocuments({}),
    Loan.countDocuments({}),
    LibraryMaterial.countDocuments({}),
    Event.countDocuments({}),
  ]);

  return res.json({
    totals: { userCount, loanCount, libraryCount, eventCount },
  });
});

// ================= NOTIFICATIONS (ADMIN SEND SIM) =================
router.post("/admin/notifications/broadcast", requireAuth, requireAdmin, async (req, res) => {
  // For a real app, you would enqueue notifications and persist them.
  return res.json({
    message: "Broadcast queued (simulation)",
    payload: { title: req.body.title || "", body: req.body.body || "" },
  });
});

module.exports = router;

