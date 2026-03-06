const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");

// Create Loan
router.post("/", async (req, res) => {
    const { userId, name, amount } = req.body;
    try {
        const newLoan = new Loan({ userId, name, amount });
        await newLoan.save();
        res.json({ message: "Loan created successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating loan" });
    }
});

// Get Loans for a user
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const loans = await Loan.find({ userId });
        res.json(loans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching loans" });
    }
});

module.exports = router;