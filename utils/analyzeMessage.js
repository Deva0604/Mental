const axios = require('axios');
const MessageAnalysis = require('../models/MessageAnalysis');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * analyzeMessage
 * @param {Document} messageDoc  (ChatMessage mongoose document: {_id, message, userId, sender,...})
 */
async function analyzeMessage(messageDoc) {
  if (!messageDoc || !messageDoc.message) return;

  const prompt = `
You are a mental health analysis model.
Analyze the following message and return ONLY a JSON object with exactly these keys:
{
  "sentiment": "positive" | "negative" | "neutral",
  "mood": 0-10,
  "anxiety": 0-10,
  "stress": 0-10,
  "energy": 0-10,
  "keywords": [ "word1", "word2", ... ],
  "topics": [ "topic1", "topic2", ... ]
}

Message: "${messageDoc.message}"
Return ONLY JSON, no extra text.
`;

  try {
    const response = await axios.post(
      OLLAMA_URL,
      { model: MODEL, prompt, stream: false },
      { timeout: 45000 }
    );

    const rawOutput = (response.data && response.data.response
      ? response.data.response
      : '').trim();

    let jsonData;
    try {
      // Attempt strict parse first
      jsonData = JSON.parse(rawOutput);
    } catch {
      // Fallback: extract JSON braces
      const start = rawOutput.indexOf('{');
      const end = rawOutput.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const slice = rawOutput.substring(start, end + 1);
        try {
          jsonData = JSON.parse(slice);
        } catch {
          console.error('Failed to parse sliced JSON for analysis.');
        }
      }
    }

    if (!jsonData) {
      console.error('AI returned unparseable content, skipping analysis.');
      return;
    }

    // Normalize / sanitize fields
    const safe = (n) =>
      typeof n === 'number' && n >= 0 && n <= 10 ? n : undefined;

    const sentimentAllowed = ['positive', 'negative', 'neutral'];
    if (!sentimentAllowed.includes(jsonData.sentiment)) {
      jsonData.sentiment = 'neutral';
    }

    const doc = await MessageAnalysis.create({
      messageId: messageDoc._id,
      sentiment: jsonData.sentiment,
      mood: safe(jsonData.mood),
      anxiety: safe(jsonData.anxiety),
      stress: safe(jsonData.stress),
      energy: safe(jsonData.energy),
      keywords: Array.isArray(jsonData.keywords)
        ? jsonData.keywords.slice(0, 25)
        : [],
      topics: Array.isArray(jsonData.topics)
        ? jsonData.topics.slice(0, 25)
        : [],
      raw: { output: rawOutput }
    });

    console.log('✅ Message analyzed:', doc._id.toString());
  } catch (err) {
    console.error('❌ AI analysis failed:', err.message);
  }
}

module.exports = { analyzeMessage };