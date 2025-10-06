const express = require('express');
const Chat = require('../models/Chat.js');
const Checkin = require('../models/Checkin.js');
const Journal = require('../models/Journal.js');
const MentalHealthScore = require('../models/MentalHealthScore');
const DailyInsight = require('../models/DailyInsight');
const ChatMessage = require('../models/ChatMessage');
const { getCache, setCache } = require('../config/redis');

const router = express.Router();

router.get("/insights/mood-trends/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const ck = `moodTrends:${userId}`;
    const cached = await getCache(ck);
    if (cached) return res.json(JSON.parse(cached));
    const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).limit(50);
    const moodCounts = chats.reduce((a, c) => {
      a[c.mood || 'neutral'] = (a[c.mood || 'neutral'] || 0) + 1;
      return a;
    }, {});
    const payload = { moodCounts };
    await setCache(ck, payload, 300);
    res.json(payload);
  } catch (e) { next(e); }
});

router.get("/insights/journals/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const ck = `journals:${userId}`;
    const cached = await getCache(ck);
    if (cached) return res.json(JSON.parse(cached));
    const journals = await Journal.find({ userId }).limit(10).sort({ createdAt: -1 });
    const payload = { journals };
    await setCache(ck, payload, 180);
    res.json(payload);
  } catch (e) { next(e); }
});

// GET /api/mental-health/graphs?userId=...&days=30
router.get("/mental-health/graphs", async (req, res) => {
  try {
    const { userId } = req.query;
    let { days = 30 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }
    days = Math.min(Math.max(parseInt(days, 10) || 30, 1), 90);

    const scores = await MentalHealthScore.find({ userId })
      .sort({ date: -1 })
      .limit(days)
      .lean();

    // Reverse to chronological order
    const ordered = scores.slice().reverse();

    const graph = {
      labels: ordered.map(s => s.date),
      mood: ordered.map(s => s.mood ?? null),
      anxiety: ordered.map(s => s.anxiety ?? null),
      stress: ordered.map(s => s.stress ?? null),
      energy: ordered.map(s => s.energy ?? null),
      overall: ordered.map(s => s.overall ?? null),
      messageCount: ordered.map(s => s.messageCount ?? 0)
    };

    return res.json({ count: ordered.length, scores: ordered, graph });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/mental-health/day/:date?userId=...   (date format: YYYY-MM-DD)
router.get("/mental-health/day/:date", async (req, res) => {
  try {
    const { userId } = req.query;
    const { date } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    const score = await MentalHealthScore.findOne({ userId, date }).lean();

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const messages = await ChatMessage.find({
      userId,
      timestamp: { $gte: dayStart, $lte: dayEnd }
    })
      .sort({ timestamp: 1 })
      .lean();

    const insights = await DailyInsight.findOne({ userId, date }).lean();

    return res.json({
      userId,
      date,
      score,
      messageCount: messages.length,
      messages,
      insights
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;