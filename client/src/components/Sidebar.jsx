const Sidebar = ({
    conversations,
    selectedConversation,
    onSelectConversation,
    users,
    showUsers,
    setShowUsers,
    onStartConversation,
    currentUserId,
}) => {
    // Get the other participant's info from a conversation
    const getOtherUser = (conversation) => {
        const otherParticipant = conversation.participants.find(
            (p) => p.user.id !== currentUserId
        );
        return otherParticipant ?.user;
    };

    return (
        <div className="w-80 bg-gray-50 border-r flex flex-col">
            <div className="p-4 border-b">
                <button 
                    onClick={() => setShowUsers(!showUsers)}
                    className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                    <span className="text-xl">+</span>
                    <span>{showUsers ? 'Back to Chats' : 'New Chat'}</span>
                </button>
            </div>
            
            {showUsers && (
                <div className="border-b bg-white">
                    <div className="p-3 bg-gray-100 font-semibold text-gray-700">
                        Start a conversation
                    </div>
                    {users.length === 0 ? (
                        <p className="p-4 text-gray-500">No users found.</p>
                    ) : (
                        users.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => onStartConversation(user.id)}
                                className="p-4 hover:bg-gray-200 cursor-pointer flex items-center gap-3"
                            >
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {user.username[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{user.username}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                {user.isOnline && (
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center">
                        No conversations yet. Start a new chat!
                    </p>
                ) : (
                    conversations.map((conversation) => {
                        const otherUser = getOtherUser(conversation);
                        const isSelected = selectedConversation ?.id === conversation.id;
                        const lastMessage = conversation.messages?.[0];

                        return (
                            <div
                                key={conversation.id}
                                onClick={() => onSelectConversation(conversation)}
                                className={`p-4 border-b cursor-pointer flex items-center gap-3 ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                            >
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {otherUser?.username?.[0]?.toUpperCase() || '?'}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold truncate">
                                            {otherUser?.username || 'Unknown User'}
                                        </p>
                                        {otherUser?.isOnline && (
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {lastMessage?.content || 'No messages yet.'}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Sidebar;