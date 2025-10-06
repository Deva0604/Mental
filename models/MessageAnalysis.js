const mongoose = require('mongoose');

const MessageAnalysisSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", required: true }, // removed index:true
  sentiment: { type: String, enum: ["positive", "negative", "neutral"], default: "neutral" },
  mood: { type: Number, min: 0, max: 10 },
  anxiety: { type: Number, min: 0, max: 10 },
  stress: { type: Number, min: 0, max: 10 },
  energy: { type: Number, min: 0, max: 10 },
  keywords: [{ type: String, trim: true }],
  topics: [{ type: String, trim: true }],
  raw: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

// Single index definition
MessageAnalysisSchema.index({ messageId: 1 });

module.exports = mongoose.model("MessageAnalysis", MessageAnalysisSchema);