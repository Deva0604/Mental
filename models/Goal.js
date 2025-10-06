const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  goal: String,
  progress: { type: Number, default: 0 }, // %
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Goal", GoalSchema);