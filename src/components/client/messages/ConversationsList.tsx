"use client";

import React from "react";
import { motion } from "framer-motion";

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
  isLoading?: boolean;
  isMobile?: boolean;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedPartnerId,
  onSelect,
  searchQuery,
  onSearchChange,
  onNewMessage,
  onlineUsers,
  isLoading = false,
  isMobile = false,
}) => {
  const filteredConversations = conversations.filter((conv) =>
    conv.partner.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Format time to show "Today", "Yesterday", or date
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="w-full border-r border-gray-200 bg-white flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div
        className={`sticky top-0 z-10 border-b border-gray-200 bg-white ${
          isMobile ? "p-3" : "p-4"
        }`}
      >
        <div
          className={`flex justify-between items-center ${
            isMobile ? "mb-3" : "mb-4"
          }`}
        >
          <h2
            className={`font-bold text-gray-900 ${
              isMobile ? "text-base" : "text-lg"
            }`}
          >
            Messages
          </h2>
          <button
            onClick={onNewMessage}
            className={`text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 rounded-full transition-colors touch-manipulation ${
              isMobile ? "p-1.5" : "p-2 bg-emerald-50 hover:bg-emerald-100"
            }`}
            title="New Message"
            aria-label="New message"
          >
            <span
              className={`material-symbols-outlined ${
                isMobile ? "text-lg" : "text-xl"
              }`}
            >
              edit_square
            </span>
          </button>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 text-sm">
              search
            </span>
          </span>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
              isMobile ? "py-1.5 text-sm rounded-lg" : "py-2 text-sm rounded-xl"
            }`}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {isLoading ? (
          // Loading Skeletons
          <div className="space-y-1 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-3 animate-pulse"
              >
                <div className="shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gray-200" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-3 bg-gray-200 rounded w-10" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center text-gray-500 ${
              isMobile ? "p-6" : "p-8"
            }`}
          >
            {searchQuery ? (
              <>
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">
                  search_off
                </span>
                <p className="text-sm font-medium mb-1">No matches found</p>
                <p className="text-xs text-gray-400">
                  Try a different search term
                </p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">
                  forum
                </span>
                <p className="text-sm font-medium mb-1">No conversations</p>
                <p className="text-xs text-gray-400">
                  Start a new conversation to begin messaging
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredConversations.map((conv, index) => (
              <motion.li
                key={conv.partner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelect(conv.partner.id)}
                className={`cursor-pointer transition-colors touch-manipulation active:bg-gray-100 ${
                  selectedPartnerId === conv.partner.id
                    ? "bg-emerald-50 hover:bg-emerald-50"
                    : "hover:bg-gray-50"
                } ${isMobile ? "p-3" : "p-4"}`}
              >
                <div className="flex space-x-3">
                  <div className="shrink-0 relative">
                    {conv.partner.image ? (
                      <img
                        src={conv.partner.image}
                        alt={conv.partner.name}
                        className={`rounded-full object-cover border border-gray-200 ${
                          isMobile ? "h-10 w-10" : "h-12 w-12"
                        }`}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200 ${
                          isMobile ? "h-10 w-10 text-base" : "h-12 w-12 text-lg"
                        }`}
                      >
                        {conv.partner.name.charAt(0)}
                      </div>
                    )}
                    {onlineUsers.has(conv.partner.id) && (
                      <span
                        className={`absolute block rounded-full ring-2 ring-white bg-green-400 ${
                          isMobile
                            ? "bottom-0 right-0 h-2 w-2"
                            : "bottom-0 right-0 h-3 w-3"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p
                        className={`truncate ${
                          selectedPartnerId === conv.partner.id
                            ? "text-emerald-900"
                            : "text-gray-900"
                        } ${
                          isMobile
                            ? "text-sm font-semibold"
                            : "text-sm font-bold"
                        }`}
                      >
                        {conv.partner.name}
                      </p>
                      <span
                        className={`text-gray-400 whitespace-nowrap ${
                          isMobile ? "text-[10px]" : "text-xs"
                        }`}
                      >
                        {formatTime(conv.lastMessage.createdAt)}
                      </span>
                    </div>

                    {/* Role and Phone Display - Hidden on small mobile */}
                    {!isMobile && (conv.partner.role || conv.partner.phone) && (
                      <div className="flex items-center gap-2 mb-1">
                        {conv.partner.role && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-medium ${
                              conv.partner.role === "PROVIDER"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            } text-[10px]`}
                          >
                            {conv.partner.role}
                          </span>
                        )}
                        {conv.partner.phone && (
                          <span className="text-[10px] text-gray-500 flex items-center">
                            <span className="material-symbols-outlined text-[10px] mr-0.5">
                              phone
                            </span>
                            {conv.partner.phone}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <p
                        className={`truncate ${
                          !conv.lastMessage.isRead && !conv.lastMessage.isOwn
                            ? "font-bold text-gray-900"
                            : "text-gray-500"
                        } ${isMobile ? "text-xs" : "text-sm"}`}
                      >
                        {conv.lastMessage.isOwn ? (
                          <span
                            className={`${
                              isMobile ? "text-[10px]" : "text-xs"
                            } text-gray-400 mr-1`}
                          >
                            You:
                          </span>
                        ) : (
                          <span
                            className={`${
                              isMobile ? "text-[10px]" : "text-xs"
                            } text-gray-400 mr-1`}
                          >
                            {conv.partner.name.split(" ")[0] ||
                              conv.partner.name}
                            :
                          </span>
                        )}
                        {conv.lastMessage.content || "📎 Attachment"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span
                          className={`ml-2 inline-flex items-center justify-center text-white bg-emerald-500 rounded-full ${
                            isMobile
                              ? "px-1.5 py-0.5 text-[10px] font-bold min-w-4 h-4"
                              : "px-2 py-0.5 text-xs font-bold min-w-4.5 h-4.5"
                          }`}
                        >
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Mobile-only empty state if no conversations */}
      {!isLoading && conversations.length === 0 && isMobile && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4">
            chat
          </span>
          <p className="text-sm font-medium text-gray-500 mb-2">
            Start your first conversation
          </p>
          <button
            onClick={onNewMessage}
            className="mt-4 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors touch-manipulation text-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Message
          </button>
        </div>
      )}
    </div>
  );
};
