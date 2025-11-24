"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const conversations = [
  {
    id: 1,
    name: "John Doe",
    lastMessage: "Can you come tomorrow at 10 AM?",
    time: "10:30 AM",
    unread: 2,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    online: true,
  },
  {
    id: 2,
    name: "Jane Smith",
    lastMessage: "Thanks for the great work!",
    time: "Yesterday",
    unread: 0,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    online: false,
  },
  {
    id: 3,
    name: "Mike Johnson",
    lastMessage: "How much for the full service?",
    time: "Yesterday",
    unread: 0,
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
    online: true,
  },
];

const messages = [
  {
    id: 1,
    sender: "John Doe",
    content: "Hi, I saw your profile and I'm interested in your services.",
    time: "10:00 AM",
    isMe: false,
  },
  {
    id: 2,
    sender: "Me",
    content: "Hello! Thanks for reaching out. How can I help you today?",
    time: "10:05 AM",
    isMe: true,
  },
  {
    id: 3,
    sender: "John Doe",
    content: "I have a leaking tap in my kitchen. Can you fix it?",
    time: "10:10 AM",
    isMe: false,
  },
  {
    id: 4,
    sender: "Me",
    content: "Absolutely! I can come by tomorrow to take a look.",
    time: "10:15 AM",
    isMe: true,
  },
  {
    id: 5,
    sender: "John Doe",
    content: "Can you come tomorrow at 10 AM?",
    time: "10:30 AM",
    isMe: false,
  },
];

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState(conversations[0]);
  const [newMessage, setNewMessage] = useState("");

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400">search</span>
            </span>
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedChat.id === chat.id ? "bg-emerald-50 border-l-4 border-emerald-500" : "border-l-4 border-transparent"
              }`}
            >
              <div className="relative">
                <img
                  src={chat.avatar}
                  alt={chat.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-semibold truncate ${selectedChat.id === chat.id ? "text-emerald-900" : "text-gray-900"}`}>
                    {chat.name}
                  </h3>
                  <span className="text-xs text-gray-500">{chat.time}</span>
                </div>
                <p className={`text-sm truncate ${selectedChat.id === chat.id ? "text-emerald-700" : "text-gray-500"}`}>
                  {chat.lastMessage}
                </p>
              </div>
              {chat.unread > 0 && (
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {chat.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="hidden md:flex flex-1 flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={selectedChat.avatar}
                alt={selectedChat.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              {selectedChat.online && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{selectedChat.name}</h3>
              <p className="text-xs text-emerald-600 font-medium">
                {selectedChat.online ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">call</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">videocam</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                  msg.isMe
                    ? "bg-emerald-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 text-right ${
                    msg.isMe ? "text-emerald-100" : "text-gray-400"
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
            <button className="p-2 text-gray-400 hover:text-emerald-600 rounded-full transition-colors">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 placeholder-gray-500"
            />
            <button className="p-2 text-gray-400 hover:text-emerald-600 rounded-full transition-colors">
              <span className="material-symbols-outlined">sentiment_satisfied</span>
            </button>
            <button 
              className={`p-2 rounded-xl transition-all ${
                newMessage.trim() 
                  ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700" 
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
