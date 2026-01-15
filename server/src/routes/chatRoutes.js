const express = require('express');
const router = express.Router();
const { getAllUsers, getOrCreateChat, getUserChats, getChatMessages, sendMessage, sendFileMessage } = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');
const { uploadMessageFile } = require('../middleware/upload');

// All routes here require authentication
router.use(authMiddleware);

// Get all users (for starting new chats)
router.get('/users', getAllUsers);

// Get or create one-on-one chat
router.post('/conversations', getOrCreateChat);

// Get all chats for the authenticated user
router.get('/conversations', getUserChats);

// Get messages for a specific chat
router.get('/conversations/:conversationId/messages', getChatMessages);

// Send a message in a chat
router.post('/messages', sendMessage);

// send a file/image message
router.post('/messages/file', uploadMessageFile.single('file'), sendFileMessage);

module.exports = router;