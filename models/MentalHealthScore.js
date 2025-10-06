const mongoose = require('mongoose');

const MentalHealthScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  mood: { type: Number, min: 0, max: 10 },
  anxiety: { type: Number, min: 0, max: 10 },
  stress: { type: Number, min: 0, max: 10 },
  energy: { type: Number, min: 0, max: 10 },
  overall: { type: Number, min: 0, max: 10 },
  messageCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Ensure one score per user per date
MentalHealthScoreSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("MentalHealthScore", MentalHealthScoreSchema);