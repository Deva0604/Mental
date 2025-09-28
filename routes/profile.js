const express = require('express');
const StudentProfile = require('../models/StudentProfile');
const auth = require('../middleware/auth');
const router = express.Router();

// Create profile
router.post('/', auth, async (req, res) => {
  try {
    const { name, age, grade } = req.body;
    const profile = new StudentProfile({ userId: req.user.id, name, age, grade });
    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get profile
router.get('/', auth, async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;