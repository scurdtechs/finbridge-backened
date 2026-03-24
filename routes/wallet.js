const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const { addPoints } = require("../utils/gamification");

function toMoney(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// ================= WALLET BALANCE =================
router.get("/wallet/balance", requireAuth, async (req, res) => {
  return res.json({ balance: req.user.balance, points: req.user.points });
});

// Backward compatibility with earlier sample paths
router.get("/balance", requireAuth, async (req, res) => {
  return res.json({ balance: req.user.balance });
});

// ================= TRANSACTIONS =================
router.get("/wallet/transactions", requireAuth, async (req, res) => {
  const phone = req.user.phone;
  const items = await Transaction.find({
    $or: [{ senderPhone: phone }, { receiverPhone: phone }],
  }).sort({ date: -1 });

  return res.json({ transactions: items });
});

router.get("/transactions", requireAuth, async (req, res) => {
  const phone = req.user.phone;
  const items = await Transaction.find({
    $or: [{ senderPhone: phone }, { receiverPhone: phone }],
  }).sort({ date: -1 });
  return res.json(items);
});

// ================= DEPOSIT =================
router.post("/wallet/deposit", requireAuth, async (req, res) => {
  const amount = toMoney(req.body.amount);
  if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });

  req.user.balance += amount;
  addPoints(req.user, 5, { reason: `Deposit +${amount} KES` });
  await req.user.save();

  await Transaction.create({
    type: "deposit",
    senderPhone: req.user.phone,
    receiverPhone: req.user.phone,
    amount,
    meta: req.body.meta || undefined,
  });

  return res.json({ message: "Deposit successful", balance: req.user.balance });
});

router.post("/deposit", requireAuth, async (req, res) => {
  const amount = toMoney(req.body.amount);
  if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });

  req.user.balance += amount;
  await req.user.save();

  await Transaction.create({
    type: "deposit",
    senderPhone: req.user.phone,
    receiverPhone: req.user.phone,
    amount,
    meta: req.body.meta || undefined,
  });

  return res.json({ message: "Deposit successful", balance: req.user.balance });
});

// ================= SEND =================
router.post("/wallet/send", requireAuth, async (req, res) => {
  try {
    const { receiverPhone } = req.body;
    const amount = toMoney(req.body.amount);

    if (!receiverPhone) return res.status(400).json({ message: "receiverPhone is required" });
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    if (String(receiverPhone) === String(req.user.phone)) return res.status(400).json({ message: "Cannot send to yourself" });

    const sender = req.user;
    if (sender.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    const receiver = await User.findOne({ phone: receiverPhone });
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    sender.balance -= amount;
    receiver.balance += amount;
    addPoints(sender, 2, { reason: `Sent +${amount} KES` });
    await sender.save();
    await receiver.save();

    await Transaction.create({
      type: "send",
      senderPhone: sender.phone,
      receiverPhone: receiver.phone,
      amount,
      meta: req.body.meta || undefined,
    });

    return res.json({ message: "Transfer successful", senderBalance: sender.balance });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/send", requireAuth, async (req, res) => {
  try {
    const { receiverPhone } = req.body;
    const amount = toMoney(req.body.amount);

    if (!receiverPhone) return res.status(400).json({ message: "receiverPhone is required" });
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    if (String(receiverPhone) === String(req.user.phone)) return res.status(400).json({ message: "Cannot send to yourself" });

    const sender = req.user;
    if (sender.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    const receiver = await User.findOne({ phone: receiverPhone });
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    sender.balance -= amount;
    receiver.balance += amount;
    await sender.save();
    await receiver.save();

    await Transaction.create({
      type: "send",
      senderPhone: sender.phone,
      receiverPhone: receiver.phone,
      amount,
      meta: req.body.meta || undefined,
    });

    return res.json({ message: "Transfer successful", senderBalance: sender.balance });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= SPLIT =================
router.post("/wallet/split", requireAuth, async (req, res) => {
  try {
    const { recipients, amount } = req.body;
    if (!Array.isArray(recipients) || recipients.length < 2) {
      return res.status(400).json({ message: "recipients must be an array with at least 2 phones" });
    }

    const total = toMoney(amount);
    if (total <= 0) return res.status(400).json({ message: "Invalid amount" });
    if (req.user.balance < total) return res.status(400).json({ message: "Insufficient balance" });

    const uniqueRecipients = [...new Set(recipients.map((p) => String(p)))];
    const per = total / uniqueRecipients.length;
    if (!Number.isFinite(per) || per <= 0) return res.status(400).json({ message: "Invalid split amount" });

    const receivers = await User.find({ phone: { $in: uniqueRecipients } });
    const foundPhones = new Set(receivers.map((u) => u.phone));
    const missing = uniqueRecipients.filter((p) => !foundPhones.has(p));
    if (missing.length > 0) return res.status(404).json({ message: "Some recipients not found", missing });

    const sender = req.user;
    sender.balance -= total;
    addPoints(sender, 3, { reason: `Split total +${total} KES` });
    await sender.save();

    for (const receiver of receivers) {
      receiver.balance += per;
    }
    await Promise.all(receivers.map((u) => u.save()));

    await Transaction.create({
      type: "split",
      senderPhone: sender.phone,
      receiverPhone: uniqueRecipients.join(","),
      amount: total,
      meta: { recipients: uniqueRecipients, per },
    });

    return res.json({ message: "Split successful", senderBalance: sender.balance, per, recipients: uniqueRecipients });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= TAP TO PAY (SIMULATED) =================
router.post("/wallet/tap-to-pay", requireAuth, async (req, res) => {
  const amount = toMoney(req.body.amount);
  const merchant = req.body.merchant ? String(req.body.merchant) : "merchant";
  if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
  if (req.user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

  req.user.balance -= amount;
  addPoints(req.user, 2, { reason: `Tap-to-pay ${amount} KES` });
  await req.user.save();

  await Transaction.create({
    type: "tap-to-pay",
    senderPhone: req.user.phone,
    receiverPhone: `MERCHANT:${merchant}`,
    amount,
    meta: { merchant },
  });

  return res.json({ message: "Tap-to-pay successful", balance: req.user.balance });
});

// ================= MICROTRANSACTIONS (SIMULATED) =================
router.post("/wallet/microtransactions", requireAuth, async (req, res) => {
  const amount = toMoney(req.body.amount);
  if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });
  if (req.user.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

  req.user.balance -= amount;
  addPoints(req.user, 1, { reason: `Microtransaction ${amount} KES` });
  await req.user.save();

  await Transaction.create({
    type: "microtransaction",
    senderPhone: req.user.phone,
    receiverPhone: req.body.receiverPhone ? String(req.body.receiverPhone) : "MICROBUCKET",
    amount,
    meta: req.body.meta || undefined,
  });

  return res.json({ message: "Microtransaction successful", balance: req.user.balance });
});

// ================= EXPORT CSV =================
router.get("/wallet/export-transactions", requireAuth, async (req, res) => {
  const phone = req.user.phone;
  const items = await Transaction.find({
    $or: [{ senderPhone: phone }, { receiverPhone: phone }],
  }).sort({ date: -1 });

  const header = ["type", "senderPhone", "receiverPhone", "amount", "date"].join(",");
  const rows = items.map((t) => {
    const cols = [
      String(t.type).replace(/,/g, ""),
      String(t.senderPhone).replace(/,/g, ""),
      String(t.receiverPhone).replace(/,/g, ""),
      String(t.amount),
      new Date(t.date).toISOString(),
    ];
    return cols.join(",");
  });

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="finbridge-transactions-${phone}.csv"`);
  return res.status(200).send(csv);
});

// ================= CROSS-DEVICE WALLET SYNC (SIMPLE) =================
router.get("/wallet/sync", requireAuth, async (req, res) => {
  const phone = req.user.phone;
  const items = await Transaction.find({
    $or: [{ senderPhone: phone }, { receiverPhone: phone }],
  }).sort({ date: -1 }).limit(200);

  return res.json({ balance: req.user.balance, transactions: items });
});

module.exports = router;

