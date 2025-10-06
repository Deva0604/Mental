const MessageAnalysis = require('../models/MessageAnalysis');
const MentalHealthScore = require('../models/MentalHealthScore');

/**
 * calculateDailyScore
 * Aggregates all MessageAnalysis docs for a user & date (UTC day) and upserts MentalHealthScore.
 * @param {String|ObjectId} userId
 * @param {String} date  YYYY-MM-DD (optional; defaults to today UTC)
 */
async function calculateDailyScore(userId, date) {
  const day = date || new Date().toISOString().slice(0, 10);

  // Fetch analyses for this user & date
  const analyses = await MessageAnalysis.find({
    'messageId': { $exists: true },
    createdAt: { $gte: new Date(`${day}T00:00:00.000Z`), $lte: new Date(`${day}T23:59:59.999Z`) }
  }).populate('messageId');

  const filtered = analyses.filter(a => a.messageId && a.messageId.userId.toString() === userId.toString());
  if (!filtered.length) return null;

  // Extract numeric metrics safely
  const moods = filtered.map(a => safeNum(a.mood));
  const anxieties = filtered.map(a => safeNum(a.anxiety));
  const stresses = filtered.map(a => safeNum(a.stress));
  const energies = filtered.map(a => safeNum(a.energy));

  const mood = avg(moods);
  const anxiety = avg(anxieties);
  const stress = avg(stresses);
  const energy = avg(energies);
  const overall = round2((mood + energy + (10 - anxiety) + (10 - stress)) / 4);

  const score = {
    userId,
    date: day,
    mood,
    anxiety,
    stress,
    energy,
    overall,
    messageCount: filtered.length
  };

  await MentalHealthScore.updateOne(
    { userId, date: day },
    { $set: score },
    { upsert: true }
  );

  return score;
}

function avg(arr) {
  const clean = arr.filter(v => typeof v === 'number' && !isNaN(v));
  if (!clean.length) return 0;
  return round2(clean.reduce((a, b) => a + b, 0) / clean.length);
}

function safeNum(n) {
  return typeof n === 'number' ? n : undefined;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateDailyScore };