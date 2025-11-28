import React from 'react';
import { motion } from 'framer-motion';

interface Conversation {
  partner: {
    id: string;
    name: string;
    image: string | null;
    role?: string;
    phone?: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isRead: boolean;
    isOwn: boolean;
  };
  unreadCount: number;
}

interface ConversationsListProps {
  conversations: Conversation[];
  selectedPartnerId: string | null;
  onSelect: (partnerId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewMessage: () => void;
  onlineUsers: Set<string>;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedPartnerId,
  onSelect,
  searchQuery,
  onSearchChange,
  onNewMessage,
  onlineUsers,
}) => {
  const filteredConversations = conversations.filter((conv) =>
    conv.partner.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full border-r border-gray-200 bg-white flex flex-col h-full">
      {/* ... (header remains same) */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          <button
            onClick={onNewMessage}
            className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors"
            title="New Message"
          >
            <span className="material-symbols-outlined">edit_square</span>
          </button>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
          </span>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No conversations found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredConversations.map((conv) => (
              <li
                key={conv.partner.id}
                onClick={() => onSelect(conv.partner.id)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedPartnerId === conv.partner.id ? 'bg-emerald-50 hover:bg-emerald-50' : ''
                }`}
              >
                <div className="flex space-x-3">
                  <div className="flex-shrink-0 relative">
                    {conv.partner.image ? (
                      <img
                        src={conv.partner.image}
                        alt={conv.partner.name}
                        className="h-12 w-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg border border-emerald-200">
                        {conv.partner.name.charAt(0)}
                      </div>
                    )}
                    {onlineUsers.has(conv.partner.id) && (
                      <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className={`text-sm font-bold truncate ${
                        selectedPartnerId === conv.partner.id ? 'text-emerald-900' : 'text-gray-900'
                      }`}>
                        {conv.partner.name}
                      </p>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Role and Phone Display */}
                    <div className="flex items-center gap-2 mb-1">
                      {conv.partner.role && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          conv.partner.role === 'PROVIDER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {conv.partner.role}
                        </span>
                      )}
                      {conv.partner.phone && (
                        <span className="text-[10px] text-gray-500 flex items-center">
                          <span className="material-symbols-outlined text-[10px] mr-0.5">phone</span>
                          {conv.partner.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate ${
                        !conv.lastMessage.isRead && !conv.lastMessage.isOwn ? 'font-bold text-gray-900' : 'text-gray-500'
                      }`}>
                        {conv.lastMessage.isOwn ? 'You: ' : ''}{conv.lastMessage.content}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-emerald-500 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
