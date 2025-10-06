const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: String,
  reply: String,
  mood: { type: String, enum: ["happy", "sad", "anxious", "stressed", "angry", "neutral"], default: "neutral" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Chat", ChatSchema);