const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  age: { type: Number },
  grade: { type: String },
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);