const express = require('express');
const {
  sendMessage,
  getMessages,
  getConversations,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations - Get recent conversation list
router.get('/conversations', protect, getConversations);

// GET /api/messages/:userId - Get chat history with specific user
router.get('/:userId', protect, getMessages);

// POST /api/messages - Send a new message
router.post('/', protect, sendMessage);

module.exports = router;
