const Message = require('../models/Message');
const User = require('../models/User');
const LocalDB = require('../config/localDb');
const { getIsConnected } = require('../config/db');

// @desc    Send a direct message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !text || !text.trim()) {
      return res.status(400).json({ message: 'Receiver ID and message text are required' });
    }

    if (getIsConnected()) {
      const message = await Message.create({
        senderId,
        receiverId,
        text: text.trim(),
      });
      return res.status(201).json(message);
    } else {
      const message = await LocalDB.sendMessage(senderId, receiverId, text.trim());
      return res.status(201).json(message);
    }
  } catch (error) {
    console.error('[SendMessage Error]', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};

// @desc    Get direct message thread between two users
// @route   GET /api/messages/:userId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const partnerId = req.params.userId;

    if (getIsConnected()) {
      const messages = await Message.find({
        $or: [
          { senderId: currentUserId, receiverId: partnerId },
          { senderId: partnerId, receiverId: currentUserId },
        ],
      }).sort({ createdAt: 1 });

      return res.json(messages);
    } else {
      const messages = await LocalDB.getMessages(currentUserId, partnerId);
      return res.json(messages);
    }
  } catch (error) {
    console.error('[GetMessages Error]', error);
    res.status(500).json({ message: 'Failed to load messages', error: error.message });
  }
};

// @desc    Get recent chat conversations list
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    if (getIsConnected()) {
      const messages = await Message.find({
        $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
      }).sort({ createdAt: -1 });

      const partnerMap = new Map();

      messages.forEach((msg) => {
        const partnerId =
          msg.senderId.toString() === currentUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString();

        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, msg);
        }
      });

      const partnerUsers = await User.find({
        _id: { $in: Array.from(partnerMap.keys()) },
      }).select('username profilePicture');

      const conversations = partnerUsers.map((user) => ({
        user,
        lastMessage: partnerMap.get(user._id.toString()),
      }));

      return res.json(conversations);
    } else {
      const conversations = await LocalDB.getConversations(currentUserId);
      return res.json(conversations);
    }
  } catch (error) {
    console.error('[GetConversations Error]', error);
    res.status(500).json({ message: 'Failed to load conversations', error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
};
