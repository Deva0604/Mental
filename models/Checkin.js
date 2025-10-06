const mongoose = require('mongoose');

const CheckinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  question: String,
  answer: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Checkin", CheckinSchema);