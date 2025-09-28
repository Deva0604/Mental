const express = require('express');
const Mood = require('../models/Mood');
const auth = require('../middleware/auth');
const router = express.Router();

// Log mood
router.post('/', auth, async (req, res) => {
  try {
    const { mood, notes } = req.body;
    const moodEntry = new Mood({ userId: req.user.id, mood, notes });
    await moodEntry.save();
    res.status(201).json(moodEntry);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get mood history
router.get('/', auth, async (req, res) => {
  try {
    const moods = await Mood.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(moods);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;