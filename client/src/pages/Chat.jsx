import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import api from '../utils/api';

const Chat = () => {
    const { user, logout } = useAuth();
    const socket = useSocket();
    const [conversations, setConversations] = useState([]); // list of conversations
    const [selectedConversation, setSelectedConversation] = useState(null); // currently open conversation
    const [users, setUsers] = useState([]); // list of users
    const [showUsers, setShowUsers] = useState(false); // whether to show user list

    // fetch conversations on mount
    useEffect(() => {
        fetchConversations();  // Get all my chats
        fetchUsers(); // Get all users i can chat with
    }, []); // empty dependency array to run only once

    // listen for new messages
    useEffect(() => {
        if (socket) {
            socket.on('new-message', (message) => {
                // update conversations with new message
                setConversations((prev) => {
                    prev.map((conv) => {
                        conv.id === message.conversationId 
                        ? { ...conv, messages: [message] } 
                        : conv // Leave others unchanged
                    })
                })
            })

            return () => {
                socket.off('new-message'); // clean up when leaving
            };
        }
    }, [socket]);


    // Get all my chats from the server
    const fetchConversations = async () => {
        try {
            const res = await api.get('/chat/conversations'); // corrected endpoint
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
        }
    };

    // Get all users I can chat with
    const fetchUsers = async () => {
        try {
            const res = await api.get('/chat/users'); // corrected endpoint
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    // Start a new chat with this person
    const startConversation = async (participantId) => {
        try {
            const res = await api.post('/chat/conversations', { participantId });
            setSelectedConversation(res.data); // open new chat
            setShowUsers(false); // close user list
            fetchConversations(); // refresh chat list
        } catch (err) {
            console.error('Failed to start conversation:', err);
        }
    };

    // Render
    return (
        <div className='h-screen flex flex-col'>
            <header className='bg-blue-500 text-white p-4 flex justify-between items-center'>
                <h1 className='text-2xl font-bold'>i-ONGEA</h1>
                <div>
                    <span>Welcome, {user?.username}</span>
                    <button
                        onClick={logout}
                        className='bg-white text-blue-500 px-4 py-2 rounded hover:bg-gray-100'
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className='flex flex-1 overflow-hidden'>
                <Sidebar 
                    conversations={conversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={setSelectedConversation}
                    users={users}
                    showUsers={showUsers}
                    setShowUsers={setShowUsers}
                    onStartConversation={startConversation}
                    currentUserId={user?.id}                
                />

                <ChatWindow 
                    conversation={selectedConversation}
                    currentUserId={user?.id}
                />
            </div>
        </div>
    );
};

export default Chat;