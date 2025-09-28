// routes/mentalhealth.js
const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const { saveChatHistory, getChatHistory } = require('../config/postgres');
const router = express.Router();

router.post('/chat', auth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`Processing authenticated message for user ${req.user.id}: "${message}"`);
    
    // Get user's recent chat history for context (last 5 messages)
    const recentHistory = await getChatHistory(req.user.id, 5);
    
    // Build context from previous conversations
    let contextPrompt = message;
    if (recentHistory && recentHistory.length > 0) {
      const context = recentHistory.reverse().map(chat => 
        `User: ${chat.message}\nAssistant: ${chat.response}`
      ).join('\n\n');
      
      contextPrompt = `Previous conversation context:\n${context}\n\nCurrent message: ${message}\n\nPlease respond considering the conversation history and provide personalized mental health support.`;
    } else {
      contextPrompt = `This is the user's first message. Please provide welcoming, personalized mental health support.\n\nUser message: ${message}`;
    }

    // Connect to WSL Ollama server with context
    const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
      model: 'CalebE/mentalhealth_model',
      prompt: contextPrompt,
      stream: false
    }, {
      timeout: 180000 // 3 minute timeout
    });
    
    const botResponse = ollamaResponse.data.response;
    
    // Store chat history in PostgreSQL with user context
    console.log(`[ChatHistory] Saving chat for user ${req.user.id}...`);
    try {
      const saved = await saveChatHistory(req.user.id, message, botResponse);
      if (saved) {
        console.log(`[ChatHistory] Saved:`, saved);
      } else {
        console.log(`[ChatHistory] Save returned null or undefined.`);
      }
    } catch (saveError) {
      console.error(`[ChatHistory] Error saving chat history:`, saveError);
    }

    res.json({
      success: true,
      response: botResponse,
      sessionId: sessionId || require('crypto').randomUUID(),
      hasContext: recentHistory.length > 0,
      contextMessages: recentHistory.length
    });
  } catch (error) {
    console.error('Mental health chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to mental health model'
    });
  }
});

// Get chat history for the logged-in user with analytics
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await getChatHistory(req.user.id, parseInt(limit));
    
    // Analytics about user's mental health journey
    const analytics = {
      totalConversations: history.length,
      firstChat: history.length > 0 ? history[history.length - 1].timestamp : null,
      lastChat: history.length > 0 ? history[0].timestamp : null,
      averageMessageLength: history.length > 0 ? 
        Math.round(history.reduce((acc, chat) => acc + chat.message.length, 0) / history.length) : 0,
      commonTopics: extractCommonTopics(history),
      moodTrends: extractMoodKeywords(history)
    };
    
    res.json({
      success: true,
      history: history.reverse(), // Show oldest first for conversation flow
      analytics,
      user_id: req.user.id
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
});

// Helper function to extract common topics
function extractCommonTopics(history) {
  const topics = [];
  const keywords = ['stress', 'anxiety', 'depression', 'work', 'family', 'sleep', 'mood', 'tired', 'worried'];
  
  keywords.forEach(keyword => {
    const count = history.filter(chat => 
      chat.message.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    if (count > 0) {
      topics.push({ topic: keyword, mentions: count });
    }
  });
  
  return topics.sort((a, b) => b.mentions - a.mentions).slice(0, 5);
}

// Helper function to extract mood trends
function extractMoodKeywords(history) {
  const positiveWords = ['happy', 'good', 'better', 'great', 'excellent', 'fine'];
  const negativeWords = ['sad', 'bad', 'worse', 'terrible', 'awful', 'stressed'];
  
  let positive = 0, negative = 0;
  
  history.forEach(chat => {
    const message = chat.message.toLowerCase();
    positive += positiveWords.filter(word => message.includes(word)).length;
    negative += negativeWords.filter(word => message.includes(word)).length;
  });
  
  return { positive, negative, ratio: positive + negative > 0 ? (positive / (positive + negative) * 100).toFixed(1) + '%' : '0%' };
}

// Simple test endpoint to verify route connectivity
// Simple test endpoint to verify route connectivity
router.post('/test-chat', (req, res) => {
    res.json({ message: 'Test chat endpoint is working!' });
});

// Streaming endpoint for faster perceived performance
router.post('/stream-chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    console.log(`Streaming message: "${message}" at ${new Date().toISOString()}`);
    const startTime = Date.now();

    try {
      // Stream the response from Ollama
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'CalebE/mentalhealth_model',
        prompt: message,
        stream: true
      }, {
        timeout: 120000,
        responseType: 'stream'
      });

      let fullResponse = '';
      
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              res.write(data.response);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      });

      response.data.on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`Stream completed in ${duration}ms`);
        res.end();
      });

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.status(500).end('Stream error occurred');
    }

  } catch (error) {
    console.error('Stream chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to mental health model'
    });
  }
});

// Debug endpoint to view all chat history (development only)
router.get('/debug-history', async (req, res) => {
  try {
    const { getChatHistory } = require('../config/postgres');
    
    // Get all history (you can modify this query in postgres.js if needed)
    const { Pool } = require('pg');
    const pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'chatbot_history', 
      password: 'postgres123',
      port: 5432,
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM chat_history ORDER BY timestamp DESC');
    client.release();
    
    res.json({
      success: true,
      total_records: result.rows.length,
      history: result.rows
    });
  } catch (error) {
    console.error('Error fetching debug history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
});

// Pretty formatted history viewer
router.get('/view-history', async (req, res) => {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'chatbot_history', 
      password: 'postgres123',
      port: 5432,
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM chat_history ORDER BY timestamp DESC');
    client.release();
    
    // Create HTML view
    let html = `
    <html>
      <head><title>Chat History</title></head>
      <body>
        <h1>Mental Health Chat History</h1>
        <p>Total conversations: ${result.rows.length}</p>
    `;
    
    result.rows.forEach((row, index) => {
      html += `
        <div style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
          <h3>Conversation #${index + 1}</h3>
          <p><strong>Time:</strong> ${row.timestamp}</p>
          <p><strong>User ID:</strong> ${row.user_id}</p>
          <p><strong>Question:</strong> ${row.message}</p>
          <p><strong>AI Response:</strong> ${row.response}</p>
        </div>
      `;
    });
    
    html += '</body></html>';
    
    res.send(html);
  } catch (error) {
    console.error('Error fetching pretty history:', error);
    res.status(500).send('Error loading history');
  }
});

// User dashboard with complete mental health overview
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Get user info from MongoDB
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('-password');
    
    // Get chat history from PostgreSQL
    const history = await getChatHistory(req.user.id, 100);
    
    // Calculate comprehensive analytics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const recentHistory = history.filter(chat => new Date(chat.timestamp) > thirtyDaysAgo);
    
    const dashboard = {
      userInfo: {
        email: user.email,
        firstName: user.profile?.firstName || 'User',
        memberSince: user.createdAt,
        lastActive: user.mentalHealthData?.lastActiveDate
      },
      chatStatistics: {
        totalChats: history.length,
        chatsThisMonth: recentHistory.length,
        averageChatsPerWeek: Math.round((recentHistory.length / 4.3) * 10) / 10,
        longestConversation: history.reduce((max, chat) => 
          chat.message.length > max ? chat.message.length : max, 0),
        firstChatDate: history.length > 0 ? history[history.length - 1].timestamp : null
      },
      mentalHealthInsights: {
        commonTopics: extractCommonTopics(history),
        moodTrends: extractMoodKeywords(history),
        progressIndicators: calculateProgress(history),
        recentActivity: recentHistory.slice(0, 5).map(chat => ({
          date: chat.timestamp,
          preview: chat.message.substring(0, 50) + '...'
        }))
      },
      recommendations: generateRecommendations(history, user)
    };
    
    // Update user's last active date
    await User.findByIdAndUpdate(req.user.id, {
      'mentalHealthData.lastActiveDate': now,
      'mentalHealthData.totalSessions': history.length
    });
    
    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard'
    });
  }
});

// Helper function to calculate progress
function calculateProgress(history) {
  if (history.length < 5) return { status: 'getting_started', sessions: history.length };
  if (history.length < 15) return { status: 'building_habits', sessions: history.length };
  if (history.length < 30) return { status: 'making_progress', sessions: history.length };
  return { status: 'experienced_user', sessions: history.length };
}

// Helper function to generate personalized recommendations
function generateRecommendations(history, user) {
  const recommendations = [];
  
  if (history.length === 0) {
    recommendations.push("Welcome! Start by sharing how you're feeling today.");
  } else if (history.length < 5) {
    recommendations.push("Keep engaging! Regular conversations help build better mental health habits.");
  } else {
    const recentChats = history.slice(0, 7);
    const hasStressKeywords = recentChats.some(chat => 
      chat.message.toLowerCase().includes('stress') || 
      chat.message.toLowerCase().includes('anxious')
    );
    
    if (hasStressKeywords) {
      recommendations.push("I notice you've mentioned stress recently. Consider trying breathing exercises or mindfulness.");
    }
    
    const lastChatDate = new Date(history[0].timestamp);
    const daysSinceLastChat = Math.floor((new Date() - lastChatDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastChat > 7) {
      recommendations.push("It's been a while since our last chat. Regular check-ins can help maintain your mental wellness.");
    } else if (daysSinceLastChat === 0) {
      recommendations.push("Great job staying engaged with your mental health today!");
    }
  }
  
  return recommendations;
}

module.exports = router;