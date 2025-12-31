const prisma = require('../lib/prisma');

// Get all users ( to start a chat with )
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                id: { not: req.user.userId }, // Give me everyone except myself
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                isOnline: true,
            },
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// create or get existing chat between two users
const getOrCreateChat = async (req, res) => {
    try {
        const { participantId } = req.body;
        const currentUserId = req.user.userId;

        // Check if chat already exists
        const existingChat = await prisma.conversation.findFirst({
            where: {
                isGroup: false,
                AND: [
                    { participants: {
                        some: { userId: currentUserId }
                    }},
                    { participants: {
                        some: { userId: participantId }
                    }},
                ],
            },
            include: {
                participants: {
                    include: { user: {
                        select: { 
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                            isOnline: true,
                        },
                    }},
                },
            },
        });
        // Return existing chat if found
        if (existingChat) {
            return res.json(existingChat);
        }

        // If not found, Create new chat
        const newChat = await prisma.conversation.create({
            data: {
                isGroup: false,
                participants: {
                    create: [
                        { userId: currentUserId },
                        { userId: participantId },   
                    ],
                },
            },
            include: {
                participants: {
                    include: { user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                            isOnline: true,
                        },
                    }},
                },
            },
        });
        res.status(201).json(newChat);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user's chats
const getUserChats = async (req, res) => {
    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId: req.user.userId } // Get all conversations where I'm a participant
                },
            },
            include: {
                participants: {
                    include: { user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                            isOnline: true,
                        },
                    }},
                },
                messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1, // Get only the latest message
                        },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(conversations);
    } catch (err) {
       console.error(err);
       res.status(500).json({ error: 'Server error' });
    }
};

// Get chat messages
const getChatMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const messages = await prisma.message.findMany({
            where: { conversationId }, // Get messages for this conversation
            include: {
                sender: {
                    select:{
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }, // Oldest first, newest last for chat history
        });

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Send message (text, image, etc.) (HTTP fallback, handled via Socket.IO)
const sendMessage = async (req, res) => {
    try {
        const { conversationId, content} = req.body;

        const message = await prisma.message.create({
            data: {
                conversationId, // Which conversation this message belongs to
                senderId: req.user.userId, // Who sent this message
                content, // The message text
            },
            include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            avatarUrl: true,
                        }
                    }
                }
        });

        res.status(201).json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAllUsers,
    getOrCreateChat,
    getUserChats,
    getChatMessages,
    sendMessage,
};