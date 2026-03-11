// server.js – FinBridge Backend ready for Vercel

// Load environment variables
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// ---------- MONGODB CONNECTION ----------
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to FinBridge Database"))
.catch(err => console.log("❌ Mongo Error:", err));

// ---------- USER MODEL ----------
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);

// ---------- TRANSACTION MODEL ----------
const transactionSchema = new mongoose.Schema({
    senderPhone: String,
    receiverPhone: String,
    amount: Number,
    type: String,
    date: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", transactionSchema);

// ---------- REGISTER ----------
app.post("/api/users/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !email || !phone || !password)
            return res.status(400).json({ message: "Name, email, phone, and password are required" });

        const existing = await User.findOne({ $or: [{ phone }, { email }] });
        if (existing) {
            if (existing.phone === phone) return res.status(400).json({ message: "Phone already exists" });
            if (existing.email === email) return res.status(400).json({ message: "Email already exists" });
        }

        const newUser = new User({ name, email, phone, password });
        await newUser.save();

        res.json({ message: "User registered successfully!" });
    } catch (err) {
        console.error("Register error:", err);
        if (err.code === 11000) {
            if (err.keyPattern.phone) return res.status(400).json({ message: "Phone already exists" });
            if (err.keyPattern.email) return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Error registering user" });
    }
});

// ---------- LOGIN ----------
app.post("/api/users/login", async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });

        if (!user || user.password !== password)
            return res.status(400).json({ message: "Invalid credentials" });

        res.json({
            message: `Login successful. Welcome back, ${user.name}!`,
            token: user.phone,
            phone: user.phone,
            name: user.name
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ---------- AUTH MIDDLEWARE ----------
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const user = await User.findOne({ phone: token });
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// ---------- GET WALLET BALANCE ----------
app.get("/api/users/balance", authMiddleware, async (req, res) => {
    try {
        res.json({ balance: req.user.balance });
    } catch (err) {
        console.error("Balance error:", err);
        res.status(500).json({ message: "Failed to get balance" });
    }
});

// ---------- DEPOSIT ----------
app.post("/api/deposit", authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: "Enter valid amount" });

        const user = req.user;
        user.balance += amount;
        await user.save();

        const tx = new Transaction({
            senderPhone: user.phone,
            receiverPhone: user.phone,
            amount,
            type: "deposit"
        });
        await tx.save();

        res.json({ message: "Deposit successful!", balance: user.balance });
    } catch (err) {
        console.error("Deposit error:", err);
        res.status(500).json({ message: "Deposit failed" });
    }
});

// ---------- SEND MONEY ----------
app.post("/api/send", authMiddleware, async (req, res) => {
    try {
        const { receiverPhone, amount } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: "Enter valid amount" });

        const sender = req.user;
        if (sender.balance < amount)
            return res.status(400).json({ message: "Insufficient balance" });

        const receiver = await User.findOne({ phone: receiverPhone });
        if (!receiver) return res.status(400).json({ message: "Receiver not found" });

        sender.balance -= amount;
        receiver.balance += amount;
        await sender.save();
        await receiver.save();

        const tx = new Transaction({
            senderPhone: sender.phone,
            receiverPhone: receiver.phone,
            amount,
            type: "send"
        });
        await tx.save();

        res.json({ message: "Money sent successfully!", balance: sender.balance });
    } catch (err) {
        console.error("Send error:", err);
        res.status(500).json({ message: "Transaction failed" });
    }
});

// ---------- TRANSACTIONS HISTORY ----------
app.get("/api/transactions", authMiddleware, async (req, res) => {
    try {
        const phone = req.user.phone;
        const txs = await Transaction.find({ $or: [{ senderPhone: phone }, { receiverPhone: phone }] }).sort({ date: -1 });
        res.json(txs);
    } catch (err) {
        console.error("Transaction error:", err);
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
});

// ---------- SERVE FRONTEND (optional) ----------
app.use(express.static(path.join(__dirname, "public")));

// ---------- START SERVER ----------
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));