require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ==============================
// MIDDLEWARE
// ==============================

app.use(cors({
    origin: "https://finbridge-fronted-4qmw-2rih2aied-scurd142-glitchs-projects.vercel.app",
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"]
}));

app.use(express.json());

// ==============================
// DATABASE CONNECTION
// ==============================

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("Database Error:", err));

// ==============================
// USER MODEL
// ==============================

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    phone: { type: String, unique: true },
    password: String,
    balance: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);

// ==============================
// TRANSACTION MODEL
// ==============================

const transactionSchema = new mongoose.Schema({
    senderPhone: String,
    receiverPhone: String,
    amount: Number,
    date: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", transactionSchema);

// ==============================
// REGISTER USER
// ==============================

app.post("/api/users/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ name, email, phone, password: hashedPassword });
        await user.save();

        res.json({ message: "Registration successful" });
    } catch (error) {
        res.status(500).json({ message: "Registration failed" });
    }
});

// ==============================
// LOGIN
// ==============================

app.post("/api/users/login", async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await User.findOne({ phone });

        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        // Compare password with hashed version
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Generate JWT token
        const token = jwt.sign({ id: user._id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({ message: "Login successful", token, name: user.name });
    } catch (error) {
        res.status(500).json({ message: "Login failed" });
    }
});

// ==============================
// AUTH MIDDLEWARE
// ==============================

const auth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1]; // Expect "Bearer <token>"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ message: "Invalid token" });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// ==============================
// GET BALANCE
// ==============================

app.get("/api/users/balance", auth, (req, res) => {
    res.json({ balance: req.user.balance });
});

// ==============================
// DEPOSIT
// ==============================

app.post("/api/deposit", auth, async (req, res) => {
    const { amount } = req.body;
    req.user.balance += Number(amount);
    await req.user.save();

    const tx = new Transaction({
        senderPhone: req.user.phone,
        receiverPhone: req.user.phone,
        amount
    });

    await tx.save();
    res.json({ message: "Deposit successful" });
});

// ==============================
// SEND MONEY
// ==============================

app.post("/api/send", auth, async (req, res) => {
    const { receiverPhone, amount } = req.body;
    const sender = req.user;

    if (sender.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    const receiver = await User.findOne({ phone: receiverPhone });
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    sender.balance -= Number(amount);
    receiver.balance += Number(amount);

    await sender.save();
    await receiver.save();

    const tx = new Transaction({
        senderPhone: sender.phone,
        receiverPhone: receiver.phone,
        amount
    });

    await tx.save();
    res.json({ message: "Money sent successfully" });
});

// ==============================
// TRANSACTION HISTORY
// ==============================

app.get("/api/transactions", auth, async (req, res) => {
    const phone = req.user.phone;

    const tx = await Transaction.find({
        $or: [{ senderPhone: phone }, { receiverPhone: phone }]
    }).sort({ date: -1 });

    res.json(tx);
});

// ==============================
// DEFAULT ROUTE
// ==============================

app.get("/", (req, res) => res.send("FinBridge Backend Running"));

// ==============================
// SERVER
// ==============================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));