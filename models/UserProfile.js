const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stressLevel: { type: Number, min: 1, max: 10, required: true },
  sleepHours: { type: Number, min: 0, max: 24, required: true },
  goals: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UserProfile", UserProfileSchema);