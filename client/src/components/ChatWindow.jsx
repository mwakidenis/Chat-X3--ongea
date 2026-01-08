import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';

const ChatWindow = ({ conversation, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const socket = useSocket();
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch messages when conversation changes
    useEffect(() => {
        if (conversation) {
            fetchMessages();
            // Join the conversation room
            socket?.emit('join-conversation', conversation.id);
        }
    }, [conversation]);

    // Listen for new messages
    useEffect(() => {
        if (socket) {
            socket.on('new-message', (message) => {
                if (message.conversationId === conversation.id) {
                    setMessages((prev) => [...prev, message]);
                }
            });

            return () => {
                socket.off('new-message');
            };
        }
    }, [socket, conversation]);

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
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    // Send a new message
    const sendMessage = async () => {
        if (!newMessage.trim() || !socket) return;

        // send via socket.IO for real-time delivery
        socket.emit('send-message', {
            conversationId: conversation.id,
            content: newMessage.trim(),
        });

        setNewMessage('');
    };

    // Get other participant's info
    const getOtherUser = () => {
        const otherParticipant = conversation?.participant.find(
            (p) => p.user.id !== currentUserId
        );
        return otherParticipant?.user;
    };

    // No conversation selected
    if (!conversation) {
        return (
            <div className='flex-1 flex items-center justify-center bg-gray-100'>
                <div className='text-center text-gray-500'>
                    <div className='text-6xl mb-4'>💬</div>
                    <p className='text-xl'>Select a conversation to start chatting</p>
                </div>
            </div>
        );
    }

    const otherUser = getOtherUser();

    return (
        <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-gray-50">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
          {otherUser?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-semibold">{otherUser?.username || 'Unknown'}</p>
          <p className="text-sm text-gray-500">
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
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isMe
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-white border rounded-bl-none'
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
    );
};

export default ChatWindow;