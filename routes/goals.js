const express = require('express');
const Goal = require('../models/Goal.js');

const router = express.Router();

router.post("/goals", async (req, res, next) => {
  try {
    const { userId, goal } = req.body;
    if (!userId || !goal) return res.status(400).json({ error: 'userId & goal required' });
    const newGoal = new Goal({ userId, goal });
    await newGoal.save();
    res.json({ message: "Goal added", newGoal });
  } catch (e) { next(e); }
});

router.get("/goals/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const goals = await Goal.find({ userId });
    res.json(goals);
  } catch (e) { next(e); }
});

module.exports = router;