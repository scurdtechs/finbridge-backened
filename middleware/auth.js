const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

    const authHeader = req.header("Authorization");

    if (!authHeader)
        return res.status(401).json({ message: "Access denied. No token." });

    try {

        // Expect: "Bearer TOKEN"
        const token = authHeader.split(" ")[1];

        const verified = jwt.verify(token, process.env.JWT_SECRET);

        req.user = verified;

        next();

    } catch (err) {

        res.status(400).json({ message: "Invalid token" });

    }
};