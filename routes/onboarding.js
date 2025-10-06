const express = require('express');
const UserProfile = require('../models/UserProfile.js');

const router = express.Router();

router.post("/onboarding", async (req, res) => {
  try {
    const { userId, stressLevel, sleepHours, goals } = req.body;

    const profile = new UserProfile({ userId, stressLevel, sleepHours, goals });
    await profile.save();

    res.json({ message: "Onboarding saved", profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;