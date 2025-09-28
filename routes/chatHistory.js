const express = require('express');
const ChatHistory = require('../models/ChatHistory');
const auth = require('../middleware/auth');
const router = express.Router();

// Store chat conversation
router.post('/store', auth, async (req, res) => {
  try {
    const { sessionId, message, response, mood, sentiment } = req.body;
    
    const chatEntry = await ChatHistory.create({
      userId: req.user.id,
      sessionId: sessionId || require('crypto').randomUUID(),
      message,
      response,
      mood,
      sentiment
    });

    res.status(201).json({
      success: true,
      data: chatEntry
    });
  } catch (error) {
    console.error('Error storing chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store chat history'
    });
  }
});

// Get user's chat history
router.get('/history', auth, async (req, res) => {
  try {
    const { sessionId, limit = 50, page = 1 } = req.query;
    
    const whereClause = { userId: req.user.id };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const offset = (page - 1) * limit;

    const chatHistory = await ChatHistory.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: chatHistory.rows,
      totalCount: chatHistory.count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(chatHistory.count / limit)
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
});

// Get chat sessions for a user
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await ChatHistory.findAll({
      where: { userId: req.user.id },
      attributes: ['sessionId', 'timestamp'],
      group: ['sessionId', 'timestamp'],
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat sessions'
    });
  }
});

// Delete chat history (optional)
router.delete('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await ChatHistory.destroy({
      where: {
        userId: req.user.id,
        sessionId
      }
    });

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat session'
    });
  }
});

module.exports = router;