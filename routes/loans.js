const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const Loan = require("../models/loan");
const { addPoints } = require("../utils/gamification");
const User = require("../models/user");

// ================= REQUEST LOAN =================
router.post("/loans/request", requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const interest = req.body.interest !== undefined ? Number(req.body.interest) : 0; // percent
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : undefined;

    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    if (!Number.isFinite(interest) || interest < 0) return res.status(400).json({ message: "Invalid interest" });

    const totalToRepay = amount + (amount * interest) / 100;
    const loan = await Loan.create({
      userId: req.user._id,
      amount,
      interest,
      status: "pending",
      totalToRepay,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      penalties: 0,
    });

    addPoints(req.user, 10, { reason: `Loan requested (${amount} KES)` });
    await req.user.save();

    return res.status(201).json({ message: "Loan requested", loan });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= LIST MY LOANS =================
router.get("/loans", requireAuth, async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ loans });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

function repaidSum(loan) {
  return (loan.repaymentHistory || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

// ================= REPAY LOAN =================
router.post("/loans/:loanId/repay", requireAuth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    if (String(loan.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
    if (loan.status !== "approved") return res.status(400).json({ message: `Cannot repay while status=${loan.status}` });

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    // In this simplified version we don't require wallet deductions here.
    // A real implementation would also reduce user's balance atomically.
    loan.repaymentHistory.push({
      amount,
      note: req.body.note ? String(req.body.note) : undefined,
    });

    const repaid = repaidSum(loan);
    const remaining = Math.max(0, Number(loan.totalToRepay || 0) - repaid);

    if (remaining <= 0.00001) {
      loan.status = "repaid";
    }

    addPoints(req.user, 8, { reason: "Loan repayment recorded" });
    await req.user.save();

    await loan.save();
    return res.json({ message: "Repayment recorded", loan });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= ADMIN APPROVE =================
router.post("/admin/loans/:loanId/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    loan.status = "approved";
    loan.dueDate = loan.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await loan.save();

    // Reward borrower for an approved request
    if (loan.userId) {
      const borrower = await User.findById(loan.userId);
      if (borrower) {
        addPoints(borrower, 5, { reason: "Loan approved" });
        await borrower.save();
      }
    }

    return res.json({ message: "Loan approved", loan });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= ADMIN DECLINE =================
router.post("/admin/loans/:loanId/decline", requireAuth, requireAdmin, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    loan.status = "declined";
    await loan.save();

    return res.json({ message: "Loan declined", loan });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

