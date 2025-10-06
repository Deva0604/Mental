const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  tag: String, // e.g. "stress", "anxiety"
  content: String
});

module.exports = mongoose.model("Resource", ResourceSchema);