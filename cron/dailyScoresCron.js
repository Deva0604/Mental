const cron = require('node-cron');
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const { calculateDailyScore } = require('../utils/dailyScores');
const DailyInsight = require('../models/DailyInsight');
const MentalHealthScore = require('../models/MentalHealthScore');

async function runDailyJob() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateStr = yesterday.toISOString().slice(0, 10);
  console.log(`[DailyScores] Starting calculation for ${dateStr}`);

  try {
    // Get distinct users who had messages yesterday
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    const userIds = await ChatMessage.distinct('userId', {
      timestamp: { $gte: start, $lte: end }
    });

    if (!userIds.length) {
      console.log('[DailyScores] No user activity yesterday.');
      return;
    }

    for (const userId of userIds) {
      try {
        const score = await calculateDailyScore(userId, dateStr);
        if (score) {
          console.log(`[DailyScores] Saved score for user ${userId} (${dateStr})`);
        } else {
          console.log(`[DailyScores] No analyses for user ${userId} (${dateStr})`);
        }
      } catch (err) {
        console.error(`[DailyScores] Error user ${userId}:`, err.message);
      }
    }

    console.log('[DailyScores] Completed daily run.');
  } catch (err) {
    console.error('[DailyScores] Fatal error:', err.message);
  }
}

// Run every day at 00:05 (server time) to ensure previous day complete
cron.schedule('5 0 * * *', () => {
  runDailyJob();
});

// Optional: expose manual trigger
module.exports = { runDailyJob };