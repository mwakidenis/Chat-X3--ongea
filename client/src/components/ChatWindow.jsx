import Avatar from './Avatar';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const ChatWindow = ({ conversation, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const socket = useSocket();
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch messages when conversation changes
    useEffect(() => {
        if (conversation) {
            fetchMessages();
            socket?.emit('join-conversation', conversation.id);
        }
    }, [conversation, socket]);

    // Listen for new messages
    useEffect(() => {
        if (socket && conversation) {
            socket.on('new-message', (message) => {
                if (message.conversationId === conversation.id) {
                    setMessages((prev) => [...prev, message]);
                    // Mark as read if we're viewing the conversation
                    markMessagesAsRead();
                }
            });

            return () => {
                socket.off('new-message');
            };
        }
    }, [socket, conversation]);

    // Listen for typing indicators
    useEffect(() => {
        if (socket && conversation) {
            socket.on('user-typing', (data) => {
                if (data.conversationId === conversation.id) {
                    setIsTyping(true);
                }
            });

            socket.on('user-stop-typing', (data) => {
                if (data.conversationId === conversation.id) {
                    setIsTyping(false);
                }
            });

            return () => {
                socket.off('user-typing');
                socket.off('user-stop-typing');
            };
        }
    }, [socket, conversation]);

    // Listen for read receipts
    useEffect(() => {
        if (socket && conversation) {
            socket.on('messages-read', (data) => {
                if (data.conversationId === conversation.id) {
                    // Mark all my messages as read
                    setMessages((prev) => 
                        prev.map((msg) => 
                            msg.senderId === currentUserId
                                ? { ...msg, isRead: true }
                                : msg
                        )
                    );
                }
            });

            return () => {
                socket.off('messages-read');
            };
        }
    }, [socket, conversation, currentUserId]);

    // Scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch messages from server
    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/chat/conversations/${conversation.id}/messages`);
            setMessages(res.data);
            markMessagesAsRead(); // Mark messages as read when loaded
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    // Send a new message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        if (selectedFile) {
            await sendFileMessage();
            return;
        }

        socket.emit('send-message', {
            conversationId: conversation.id,
            content: newMessage.trim(),
        });

        // Stop typing when message sent
        socket.emit('typing-stop', conversation.id);
        setNewMessage('');
    };

    // Handle typing indicator
    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!socket || !conversation) return;

        socket.emit('typing-start', conversation.id);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing-stop', conversation.id);
        }, 2000);
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if(!file) return;

        setSelectedFile(file);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setFilePreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    // Clear selected file
    const clearSelectedFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Send file message
    const sendFileMessage = async () => {
        if (!selectedFile || !socket) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('conversationId', conversation.id);
            if (newMessage.trim()) {
                formData.append('content', newMessage.trim());
            }

            await api.post('/chat/messages/file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            clearSelectedFile();
            setNewMessage('');
        } catch (err) {
            console.error('Failed to send file message:', err);
            alert('Failed to send file. Please try again.');
        } finally {
            setUploading(false);
        }
    }

    // Mark messages as read when conversation is viewed
    const markMessagesAsRead = () => {
        if (socket && conversation && currentUserId) {
            socket.emit('mark-read', {
                conversationId: conversation.id,
                readerId: currentUserId,
            });
        }
    }

    // Get other participant's info
    const getOtherUser = () => {
        const otherParticipant = conversation?.participants.find(
            (p) => p.user.id !== currentUserId
        );
        return otherParticipant?.user;
    };

    // No conversation selected
    if (!conversation) {
        return (
            <div className='flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900'>
                <div className='text-center text-gray-500 dark:text-gray-400'>
                    <div className='text-6xl mb-4'>💬</div>
                    <p className='text-xl'>Select a conversation to start chatting</p>
                </div>
            </div>
        );
    }

    const otherUser = getOtherUser();

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3 bg-gray-50 dark:bg-gray-800">
                {/* <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {otherUser?.username?.[0]?.toUpperCase() || '?'}
                </div> */}
                <Avatar user={otherUser} size="md" />
                <div>
                    <p className="font-semibold dark:text-white">{otherUser?.username || 'Unknown'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {otherUser?.isOnline ? (
                            <span className="text-green-500">● Online</span>
                        ) : (
                            'Offline'
                        )}
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {loading ? (
                    <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">
                        No messages yet. Say hello! 👋
                    </div>
                ) : (
                   messages.map((message) => {
                        const isMe = message.senderId === currentUserId;
                        return (
                            <div
                                key={message.id}
                                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                {/* Message Bubble */}
                                {!isMe && <Avatar user={otherUser} size='sm' />}
                                
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                        isMe
                                            ? 'bg-blue-500 text-white rounded-br-none'
                                            : 'bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-white rounded-bl-none'
                                    }`}
                                >

                                    {/* <p>{message.content}</p> */}
                                    {/* Image display */}
                                        {message.fileUrl && message.fileType === 'image' && (
                                            <img
                                                src={`http://localhost:5000${message.fileUrl}`}
                                                alt={message.fileName}
                                                className="max-w-full rounded-lg mb-2 cursor-pointer"
                                                onClick={() => window.open(`http://localhost:5000${message.fileUrl}`, '_blank')}
                                            />
                                        )}

                                        {/* Document/file display */}
                                        {message.fileUrl && message.fileType === 'document' && (
                                            <a
                                                href={`http://localhost:5000${message.fileUrl}`}
                                                download={message.fileName}
                                                className={`flex items-center gap-2 p-2 rounded mb-2 ${
                                                    isMe ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-600'
                                                }`}
                                            >
                                                <span>📄</span>
                                                <span className="truncate text-sm">{message.fileName}</span>
                                                <span className="text-xs">⬇</span>
                                            </a>
                                        )}

                                        {/* Text content (caption) */}
                                        {message.content && <p>{message.content}</p>}

                                        {/* Timestamp and read receipts */}
                                        <div className={`flex items-center justify-end gap-1 mt-1`}>
                                            {/* ... keep existing timestamp and checkmarks ... */}
                                        </div>
                                    <div className={`flex items-center justify-end gap-1 mt-1`}>
                                        <p
                                            className={`text-xs ${
                                                isMe ? 'text-blue-100' : 'text-gray-400'
                                            }`}
                                        >
                                            {new Date(message.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                        {/* Read Receipt Checkmarks - only for my messages */}
                                        {isMe && (
                                            <span className={`text-xs ${message.isRead ? 'text-blue-200' : 'text-blue-300'}`}>
                                                {message.isRead ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                
                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                            <p className="text-gray-500 dark:text-gray-300 text-sm italic">
                                Typing...
                            </p>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

           {/* File Preview */}
{selectedFile && (
    <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-3">
            {filePreview ? (
                <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
            ) : (
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <span className="text-2xl">📄</span>
                </div>
            )}
            <div className="flex-1">
                <p className="text-sm font-medium dark:text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
                type="button"
                onClick={clearSelectedFile}
                className="text-red-500 hover:text-red-700 p-1"
            >
                ✕
            </button>
        </div>
    </div>
)}

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                    {/* File attachment button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        📎
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                        className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || uploading}
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {uploading ? '...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;