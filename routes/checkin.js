const express = require('express');
const Checkin = require('../models/Checkin.js');

const router = express.Router();

router.post("/checkin", async (req, res) => {
  try {
    const { userId, answer } = req.body;

    const checkin = new Checkin({
      userId,
      question: "How are you feeling today?",
      answer
    });
    await checkin.save();

    res.json({ message: "Check-in saved", checkin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;