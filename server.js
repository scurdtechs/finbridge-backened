const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ==============================
// MIDDLEWARE
// ==============================

app.use(cors({
    origin: "*"
}));

app.use(express.json());


// ==============================
// DATABASE CONNECTION
// ==============================

mongoose.connect(process.env.MONGO_URL)

.then(() => {
    console.log("MongoDB Connected");
})

.catch((err) => {
    console.log("Database Error:", err);
});


// ==============================
// USER MODEL
// ==============================

const userSchema = new mongoose.Schema({

    name: String,

    email: {
        type: String,
        unique: true
    },

    phone: {
        type: String,
        unique: true
    },

    password: String,

    balance: {
        type: Number,
        default: 0
    }

});

const User = mongoose.model("User", userSchema);


// ==============================
// TRANSACTION MODEL
// ==============================

const transactionSchema = new mongoose.Schema({

    senderPhone: String,

    receiverPhone: String,

    amount: Number,

    date: {
        type: Date,
        default: Date.now
    }

});

const Transaction = mongoose.model("Transaction", transactionSchema);


// ==============================
// REGISTER USER
// ==============================

app.post("/api/users/register", async (req, res) => {

    try {

        const { name, email, phone, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ phone }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const user = new User({
            name,
            email,
            phone,
            password
        });

        await user.save();

        res.json({
            message: "Registration successful"
        });

    } catch (error) {

        res.status(500).json({
            message: "Registration failed"
        });

    }

});


// ==============================
// LOGIN
// ==============================

app.post("/api/users/login", async (req, res) => {

    try {

        const { phone, password } = req.body;

        const user = await User.findOne({ phone });

        if (!user || user.password !== password) {

            return res.status(400).json({
                message: "Invalid credentials"
            });

        }

        res.json({

            message: "Login successful",

            token: user.phone,
            name: user.name

        });

    } catch (error) {

        res.status(500).json({
            message: "Login failed"
        });

    }

});


// ==============================
// AUTH MIDDLEWARE
// ==============================

const auth = async (req, res, next) => {

    const token = req.headers.authorization;

    if (!token) {

        return res.status(401).json({
            message: "Unauthorized"
        });

    }

    const user = await User.findOne({
        phone: token
    });

    if (!user) {

        return res.status(401).json({
            message: "Invalid token"
        });

    }

    req.user = user;

    next();

};


// ==============================
// GET BALANCE
// ==============================

app.get("/api/users/balance", auth, (req, res) => {

    res.json({
        balance: req.user.balance
    });

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

    res.json({
        message: "Deposit successful"
    });

});


// ==============================
// SEND MONEY
// ==============================

app.post("/api/send", auth, async (req, res) => {

    const { receiverPhone, amount } = req.body;

    const sender = req.user;

    if (sender.balance < amount) {

        return res.status(400).json({
            message: "Insufficient balance"
        });

    }

    const receiver = await User.findOne({
        phone: receiverPhone
    });

    if (!receiver) {

        return res.status(404).json({
            message: "Receiver not found"
        });

    }

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

    res.json({
        message: "Money sent successfully"
    });

});


// ==============================
// TRANSACTION HISTORY
// ==============================

app.get("/api/transactions", auth, async (req, res) => {

    const phone = req.user.phone;

    const tx = await Transaction.find({

        $or: [
            { senderPhone: phone },
            { receiverPhone: phone }
        ]

    }).sort({ date: -1 });

    res.json(tx);

});


// ==============================
// DEFAULT ROUTE
// ==============================

app.get("/", (req, res) => {

    res.send("FinBridge Backend Running");

});


// ==============================
// SERVER
// ==============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log("Server running on port " + PORT);

});