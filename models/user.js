const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    type: String, // deposit, withdraw, send
    amount: Number,
    date: { type: Date, default: Date.now },
    to: String,   // email if sent
    from: String  // email if received
});

const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    phone: String,
    password: String,
    balance: { type: Number, default: 0 },
    transactions: [transactionSchema]
});

module.exports = mongoose.model("User", userSchema);