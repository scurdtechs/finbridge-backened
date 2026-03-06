const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// ================= REGISTER =================
router.post("/register", async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;

        // Check if email exists
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "Email already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            fullName,
            email,
            phone,
            password: hashedPassword,
            balance: 0,
            transactions: []
        });

        await user.save();

        res.status(201).json({ message: "User registered successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, "secretkey");

        res.json({
            message: "Login successful",
            token
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= VIEW BALANCE =================
router.get("/balance", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ fullName: user.fullName, balance: user.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= TRANSACTION HISTORY =================
router.get("/transactions", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= DEPOSIT =================
router.post("/deposit", auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const money = Number(amount);

        if (isNaN(money) || money <= 0)
            return res.status(400).json({ message: "Invalid amount" });

        const user = await User.findById(req.user.id);
        user.balance += money;

        user.transactions.push({
            type: "deposit",
            amount: money,
            date: new Date()
        });

        await user.save();

        res.json({ message: "Deposit successful", balance: user.balance });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= WITHDRAW =================
router.post("/withdraw", auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const money = Number(amount);

        const user = await User.findById(req.user.id);

        if (user.balance < money)
            return res.status(400).json({ message: "Insufficient balance" });

        user.balance -= money;

        user.transactions.push({
            type: "withdraw",
            amount: money,
            date: new Date()
        });

        await user.save();

        res.json({ message: "Withdraw successful", balance: user.balance });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= SEND MONEY =================
router.post("/send", auth, async (req, res) => {
    try {
        const { toEmail, amount } = req.body;
        const money = Number(amount);

        const sender = await User.findById(req.user.id);
        const receiver = await User.findOne({ email: toEmail });

        if (!receiver)
            return res.status(404).json({ message: "Receiver not found" });

        if (money <= 0) return res.status(400).json({ message: "Invalid amount" });

        if (sender.balance < money)
            return res.status(400).json({ message: "Insufficient balance" });

        sender.balance -= money;
        receiver.balance += money;

        // Record transactions
        sender.transactions.push({
            type: "send",
            amount: money,
            to: receiver.email,
            date: new Date()
        });

        receiver.transactions.push({
            type: "received",
            amount: money,
            from: sender.email,
            date: new Date()
        });

        await sender.save();
        await receiver.save();

        res.json({ message: "Transfer successful", senderBalance: sender.balance });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;