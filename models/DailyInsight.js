const mongoose = require('mongoose');

const DailyInsightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  summary: { type: String, trim: true },
  positives: [{ type: String, trim: true }],
  negatives: [{ type: String, trim: true }],
  recommendations: [{ type: String, trim: true }],
  meta: {
    generated: { type: Boolean, default: false }, // whether AI generated
    sourceMessages: { type: Number, default: 0 }
  }
}, { timestamps: true });

// One insight per user per date
DailyInsightSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("DailyInsight", DailyInsightSchema);