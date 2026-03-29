"use client";

import { ChatWindow } from "@/components/client/messages/ChatWindow";
import { ConversationsList } from "@/components/client/messages/ConversationsList";
import { NewConversationModal } from "@/components/client/messages/NewConversationModal";
import apiClient from "@/lib/api/client";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";

// Force dynamic rendering to prevent SSR issues with socket.io
export const dynamic = "force-dynamic";

interface Conversation {
  partner: {
    id: string;
    name: string;
    image: string | null;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isRead: boolean;
    isOwn: boolean;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
  isRead: boolean;
  isDelivered?: boolean;
}

function ClientMessagesContent() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const selectedPartnerIdRef = useRef<string | null>(selectedPartnerId);

  useEffect(() => {
    selectedPartnerIdRef.current = selectedPartnerId;
  }, [selectedPartnerId]);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const { data } = await apiClient.get<{ conversations: Conversation[] }>(
          "/messages/conversations",
        );
        setConversations(data.conversations);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  // Socket connection and listeners
  useEffect(() => {
    if (!session?.user) return;

    socket.connect();
    socket.emit("join", session.user.id);

    const handleReceiveMessage = (message: any) => {
      const activePartnerId = selectedPartnerIdRef.current;

      if (
        activePartnerId &&
        (message.senderId === activePartnerId ||
          message.receiverId === activePartnerId)
      ) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          return exists ? prev : [...prev, message];
        });
      }

      setConversations((prev) => {
        const newConvs = [...prev];
        const convIndex = newConvs.findIndex(
          (c) =>
            c.partner.id === message.senderId ||
            c.partner.id === message.receiverId,
        );

        if (convIndex >= 0) {
          newConvs[convIndex] = {
            ...newConvs[convIndex],
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              isRead: false,
              isOwn: message.senderId === session.user.id,
            },
            unreadCount:
              message.senderId !== session.user.id &&
              activePartnerId !== message.senderId
                ? newConvs[convIndex].unreadCount + 1
                : newConvs[convIndex].unreadCount,
          };
          const [updatedConv] = newConvs.splice(convIndex, 1);
          newConvs.unshift(updatedConv);
        }

        return newConvs;
      });
    };

    const handleUserTyping = ({ senderId }: { senderId: string }) => {
      if (senderId === selectedPartnerIdRef.current) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = ({ senderId }: { senderId: string }) => {
      if (senderId === selectedPartnerIdRef.current) {
        setIsTyping(false);
      }
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const handleOnlineUsersList = ({ userIds }: { userIds: string[] }) => {
      setOnlineUsers(new Set(userIds));
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("online_users_list", handleOnlineUsersList);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("online_users_list", handleOnlineUsersList);
    };
  }, [session]);

  // Fetch messages when selecting a partner
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedPartnerId) return;
      try {
        const { data } = await apiClient.get<{ messages: Message[] }>(
          `/messages/history/${selectedPartnerId}`,
        );
        setMessages(data.messages);

        // Mark as read locally
        setConversations((prev) =>
          prev.map((c) => {
            if (c.partner.id === selectedPartnerId) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          }),
        );
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    fetchMessages();
  }, [selectedPartnerId]);

  const handleSendMessage = async (
    content: string,
    fileUrl?: string,
    fileType?: string,
  ) => {
    if (!selectedPartnerId || !session?.user) return;

    // Optimistic update
    const tempId = Date.now().toString();
    const newMessage = {
      id: tempId,
      senderId: session.user.id,
      content,
      fileUrl,
      fileType,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDelivered: false,
    };

    // Add to messages immediately for instant feedback
    setMessages((prev) => [...prev, newMessage]);

    // Emit socket event immediately for real-time feel
    socket.emit("send_message", {
      ...newMessage,
      receiverId: selectedPartnerId,
    });

    try {
      // Persist to DB
      await apiClient.post("/messages/send", {
        receiverId: selectedPartnerId,
        content,
        fileUrl,
        fileType,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Optimistic update
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      await apiClient.delete(`/messages/${messageId}`);
    } catch (error) {
      console.error("Failed to delete message:", error);
      // Revert if failed (would need to fetch messages again or keep a backup)
      // For now, we'll just log the error
    }
  };

  const handleClearConversation = async (partnerId: string) => {
    // Optimistic update - clear messages locally
    setMessages([]);

    try {
      await apiClient.delete(`/messages/clear/${partnerId}`);
      // Remove conversation from list
      setConversations((prev) =>
        prev.filter((c) => c.partner.id !== partnerId),
      );
      setSelectedPartnerId(null);
    } catch (error) {
      console.error("Failed to clear conversation:", error);
      // Could refetch messages here if needed
    }
  };

  const handleSelectUser = (contact: any) => {
    // Check if conversation already exists
    const existingConv = conversations.find((c) => c.partner.id === contact.id);

    if (existingConv) {
      setSelectedPartnerId(contact.id);
    } else {
      // Create new temporary conversation
      const newConv: Conversation = {
        partner: {
          id: contact.id,
          name: contact.name || "Unknown",
          image: contact.image,
        },
        lastMessage: {
          content: "",
          createdAt: new Date().toISOString(),
          isRead: true,
          isOwn: true,
        },
        unreadCount: 0,
      };

      setConversations((prev) => [newConv, ...prev]);
      setSelectedPartnerId(contact.id);
    }

    setIsNewConversationOpen(false);
  };

  const selectedPartner =
    conversations.find((c) => c.partner.id === selectedPartnerId)?.partner ||
    null;

  return (
    <div className="h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] bg-gray-50">
      <div className="max-w-7xl mx-auto h-full px-0 sm:px-3 md:px-4">
        <div className="flex h-full bg-white rounded-none sm:rounded-xl md:rounded-2xl overflow-hidden shadow-none sm:shadow-sm border-0 sm:border border-gray-200 mt-0 sm:mt-2 md:mt-4">
          {/* Conversations List */}
          <div
            className={`h-full transition-all duration-200 ${
              selectedPartnerId
                ? "hidden sm:block sm:w-1/3 lg:w-1/4 xl:w-1/3"
                : "w-full sm:w-1/3 lg:w-1/4 xl:w-1/3"
            }`}
          >
            <ConversationsList
              conversations={conversations}
              selectedPartnerId={selectedPartnerId}
              onSelect={setSelectedPartnerId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNewMessage={() => setIsNewConversationOpen(true)}
              onlineUsers={onlineUsers}
              isLoading={isLoading}
              isMobile={isMobile}
            />
          </div>

          {/* Chat Window */}
          <div
            className={`h-full transition-all duration-200 ${
              selectedPartnerId
                ? "w-full sm:w-2/3 lg:w-3/4 xl:w-2/3"
                : "hidden sm:block sm:w-2/3 lg:w-3/4 xl:w-2/3"
            }`}
          >
            <ChatWindow
              partner={selectedPartner}
              messages={messages}
              currentUserId={session?.user?.id || ""}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onClearConversation={handleClearConversation}
              isTyping={isTyping}
              isOnline={
                selectedPartnerId ? onlineUsers.has(selectedPartnerId) : false
              }
              onBack={() => setSelectedPartnerId(null)}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        onSelectUser={handleSelectUser}
        isMobile={isMobile}
      />
    </div>
  );
}

// Wrapper component that disables SSR for the messages page
// This prevents socket.io from trying to access window during server-side rendering
export default function ClientMessagesPage() {
  return <ClientMessagesContent />;
}
