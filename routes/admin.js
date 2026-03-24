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

// ================= REPORT EXPORT (CSV) =================
router.get("/admin/reports/export", requireAuth, requireAdmin, async (req, res) => {
  try {
    const resource = req.query.resource ? String(req.query.resource) : "loans";
    if (!["loans", "librarymaterials"].includes(resource)) {
      return res.status(400).json({ message: "Invalid resource" });
    }

    if (resource === "loans") {
      const loans = await Loan.find({}).sort({ createdAt: -1 }).limit(500);
      const header = ["loanId", "userId", "amount", "interest", "status", "totalToRepay", "dueDate", "createdAt"].join(",");
      const rows = loans.map((l) =>
        [
          l._id,
          l.userId,
          l.amount,
          l.interest,
          l.status,
          l.totalToRepay,
          l.dueDate ? new Date(l.dueDate).toISOString() : "",
          new Date(l.createdAt).toISOString(),
        ]
          .map((x) => String(x ?? "").replace(/,/g, " "))
          .join(",")
      );

      const csv = [header, ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="finbridge-loans-report.csv"`);
      return res.status(200).send(csv);
    }

    if (resource === "librarymaterials") {
      const items = await LibraryMaterial.find({}).sort({ createdAt: -1 }).limit(500);
      const header = ["materialId", "title", "subject", "category", "url", "offlineAvailable", "createdAt"].join(",");
      const rows = items.map((m) =>
        [
          m._id,
          m.title,
          m.subject,
          m.category,
          m.url,
          m.offlineAvailable,
          new Date(m.createdAt).toISOString(),
        ]
          .map((x) => String(x ?? "").replace(/,/g, " "))
          .join(",")
      );

      const csv = [header, ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="finbridge-library-report.csv"`);
      return res.status(200).send(csv);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;


