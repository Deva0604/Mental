const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true, trim: true },
  sender: { type: String, enum: ["user", "bot"], required: true },
  timestamp: { type: Date, default: Date.now },
  // Optional fields for future real-time features
  meta: {
    mood: { type: String, enum: ["happy", "sad", "anxious", "stressed", "angry", "neutral"], default: "neutral" },
    analyzed: { type: Boolean, default: false }
  }
});

// Helpful compound index for querying recent chats per user
ChatMessageSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);