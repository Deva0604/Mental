const express = require('express');
const Chat = require('../models/Chat.js');
const { detectMood } = require('../utils/moodDetection.js');
const { safetyCheck } = require('../middleware/safetyCheck.js');
const axios = require('axios');
const ChatMessage = require('../models/ChatMessage');
const MessageAnalysis = require('../models/MessageAnalysis');
const MentalHealthScore = require('../models/MentalHealthScore');
const DailyInsight = require('../models/DailyInsight');

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) return res.status(400).json({ error: 'userId & message required' });
    console.log('📨 Chat request received:', { userId, message: message.substring(0, 50) + '...' });

    // Safety check for crisis situations
    if (safetyCheck(message)) {
      console.log('🚨 Safety check triggered');
      return res.json({
        safety_level: "critical",
        message: "You're not alone. Please call 9152987821 (Suicide Prevention Helpline India).",
        steps: ["Try grounding exercise", "Talk to a trusted friend", "Call helpline"]
      });
    }

    console.log('🔍 Detecting mood...');
    const mood = await detectMood(message);
    console.log('😊 Mood detected:', mood);

    let reply;
    try {
      console.log('🤖 Calling Ollama...');
      const replyResponse = await axios.post("http://localhost:11434/api/generate", {
        model: "llama3",
        prompt: message,
        stream: false
      }, {
        timeout: 10000 // 10 second timeout
      });
      reply = replyResponse.data.response;
      console.log('✅ Ollama response received');
    } catch (ollamaError) {
      console.error('❌ Ollama error:', ollamaError.message);
      // Fallback response if Ollama is not available
      reply = "I'm here to help you. Please tell me more about how you're feeling.";
      console.log('🔄 Using fallback response');
    }

    console.log('💾 Saving chat to database...');
    const chat = new Chat({ userId, message, reply, mood });
    await chat.save();
    console.log('✅ Chat saved successfully');

    res.json({ user_message: message, reply, mood });
  } catch (e) { next(e); }
});

// Add /message endpoint with async analysis
router.post("/message", async (req, res) => {
  const { userId, message, sender } = req.body;
  if (!userId || !message || !sender) {
    return res.status(400).json({ error: "userId, message, sender required" });
  }

  try {
    const chatMsg = await ChatMessage.create({ userId, message, sender });

    if (sender === "user") {
      analyzeMessage(chatMsg).catch(e => console.error('Analyze error:', e.message));
    }

    return res.json({ messageId: chatMsg._id, timestamp: chatMsg.timestamp });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function analyzeMessage(chatMsg) {
  // Basic heuristic sentiment & metrics (placeholder for real AI)
  const txt = chatMsg.message.toLowerCase();
  const negativeWords = ['sad','anxious','stress','stressed','angry','tired','panic','worried','depressed'];
  const positiveWords = ['grateful','happy','calm','relaxed','good','better','progress','proud'];

  const negHits = negativeWords.filter(w => txt.includes(w)).length;
  const posHits = positiveWords.filter(w => txt.includes(w)).length;

  let sentiment = 'neutral';
  if (negHits > posHits && negHits > 0) sentiment = 'negative';
  else if (posHits > negHits && posHits > 0) sentiment = 'positive';

  // Simple 0-10 scoring
  const stress = Math.min(10, negHits * 2);
  const anxiety = txt.includes('anxious') || txt.includes('panic') ? Math.min(10, 4 + negHits) : Math.min(10, negHits);
  const mood = sentiment === 'positive' ? 7 + posHits : sentiment === 'negative' ? Math.max(0, 5 - negHits) : 5;
  const energy = txt.includes('tired') ? 3 : 6;

  const keywords = [...new Set([...negativeWords, ...positiveWords].filter(w => txt.includes(w)))];
  const topics = [
    txt.includes('work') && 'work',
    txt.includes('sleep') && 'sleep',
    txt.includes('family') && 'family',
    txt.includes('study') && 'study',
    txt.includes('exam') && 'exam'
  ].filter(Boolean);

  const analysis = await MessageAnalysis.create({
    messageId: chatMsg._id,
    sentiment,
    mood,
    anxiety,
    stress,
    energy,
    keywords,
    topics,
    raw: {
      heuristic: true,
      counts: { posHits, negHits }
    }
  });

  await upsertDailyScore(chatMsg.userId, { mood, anxiety, stress, energy });

  await maybeGenerateDailyInsight(chatMsg.userId);

  return analysis;
}

async function upsertDailyScore(userId, metrics) {
  const dateStr = new Date().toISOString().slice(0,10);
  const doc = await MentalHealthScore.findOneAndUpdate(
    { userId, date: dateStr },
    {
      $inc: { messageCount: 1 },
      $setOnInsert: { date: dateStr, userId },
      $set: {
        mood: metrics.mood,
        anxiety: metrics.anxiety,
        stress: metrics.stress,
        energy: metrics.energy,
        overall: Math.round(
          (metrics.mood + (10 - metrics.anxiety) + (10 - metrics.stress) + metrics.energy) / 4
        )
      }
    },
    { upsert: true, new: true }
  );
  return doc;
}

async function maybeGenerateDailyInsight(userId) {
  const dateStr = new Date().toISOString().slice(0,10);
  const existing = await DailyInsight.findOne({ userId, date: dateStr });
  if (existing) return;

  const lastScores = await MentalHealthScore.find({ userId }).sort({ date: -1 }).limit(5);
  if (!lastScores.length) return;

  const avgMood = Math.round(lastScores.reduce((a,c)=>a+(c.mood||0),0)/lastScores.length);
  const avgStress = Math.round(lastScores.reduce((a,c)=>a+(c.stress||0),0)/lastScores.length);
  const avgAnxiety = Math.round(lastScores.reduce((a,c)=>a+(c.anxiety||0),0)/lastScores.length);

  const positives = [];
  if (avgMood >= 6) positives.push('Mood holding in healthy range');
  if (avgStress <= 4) positives.push('Stress relatively managed');
  if (avgAnxiety <= 4) positives.push('Anxiety under control');

  const negatives = [];
  if (avgStress >= 6) negatives.push('Elevated stress signals');
  if (avgAnxiety >= 6) negatives.push('Persistent anxiety indicators');
  if (avgMood <= 4) negatives.push('Low mood trend detected');

  const recommendations = [];
  if (avgStress >= 6) recommendations.push('Schedule short decompression breaks every 2 hours');
  if (avgAnxiety >= 6) recommendations.push('Practice a 5-minute breathing exercise (4-7-8)');
  if (avgMood <= 4) recommendations.push('List 3 small wins from today before bedtime');
  if (!recommendations.length) recommendations.push('Maintain current routines and track consistency');

  await DailyInsight.create({
    userId,
    date: dateStr,
    summary: `Mood avg ${avgMood}, Stress avg ${avgStress}, Anxiety avg ${avgAnxiety}`,
    positives,
    negatives,
    recommendations,
    meta: { generated: true, sourceMessages: lastScores.reduce((a,c)=>a+(c.messageCount||0),0) }
  });
}

// GET /api/chat/chat/history?userId=...&days=7
router.get("/chat/history", async (req, res, next) => {
  try {
    const { userId } = req.query;
    let { days = 7 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    days = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const messages = await ChatMessage.find({
      userId,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: -1 })
      .lean();

    const msgIds = messages.map(m => m._id);
    const analyses = await MessageAnalysis.find({ messageId: { $in: msgIds } }).lean();

    // Build a lookup for analyses by messageId
    const analysisMap = analyses.reduce((acc, a) => {
      acc[a.messageId.toString()] = a;
      return acc;
    }, {});

    const combined = messages.map(m => ({
      ...m,
      analysis: analysisMap[m._id.toString()] || null
    }));

    return res.json({
      userId,
      rangeDays: days,
      count: combined.length,
      messages: combined
    });
  } catch (e) { next(e); }
});

module.exports = router;