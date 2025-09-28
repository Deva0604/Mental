const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  profile: {
    fullName: { type: String, default: '' },
    dob: { type: Date, default: null },
    preferences: {
      chatbotPersonality: { type: String, enum: ['supportive', 'professional', 'friendly'], default: 'supportive' },
      reminderFrequency: { type: String, enum: ['daily', 'weekly', 'none'], default: 'none' }
    }
  },
  mentalHealthData: {
    firstChatDate: { type: Date },
    totalSessions: { type: Number, default: 0 },
    lastActiveDate: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);