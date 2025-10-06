const axios = require('axios');

async function detectMood(message) {
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3",
      prompt: `Classify the mood of this text into one of [happy, sad, anxious, stressed, angry, neutral]: "${message}". Only return the label.`,
      stream: false
    }, {
      timeout: 5000 // 5 second timeout
    });

    const output = response.data.response.trim().toLowerCase();
    const moods = ["happy", "sad", "anxious", "stressed", "angry", "neutral"];
    return moods.includes(output) ? output : "neutral";
  } catch (err) {
    console.error('Error detecting mood:', err.message);
    // Simple keyword-based fallback
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('happy') || lowerMessage.includes('great') || lowerMessage.includes('good')) return 'happy';
    if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('unhappy')) return 'sad';
    if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('nervous')) return 'anxious';
    if (lowerMessage.includes('stressed') || lowerMessage.includes('overwhelmed') || lowerMessage.includes('pressure')) return 'stressed';
    if (lowerMessage.includes('angry') || lowerMessage.includes('mad') || lowerMessage.includes('frustrated')) return 'angry';
    return "neutral";
  }
}

module.exports = { detectMood };