"use client";

import { ChatWindow } from "@/components/client/messages/ChatWindow";
import { ConversationsList } from "@/components/client/messages/ConversationsList";
import { NewConversationModal } from "@/components/client/messages/NewConversationModal";
import apiClient from "@/lib/api/client";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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

export default function ClientMessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        const { data } = await apiClient.get<{ conversations: Conversation[] }>(
          "/messages/conversations"
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

  // Socket connection
  useEffect(() => {
    if (session?.user) {
      socket.connect();
      socket.emit("join", session.user.id);

      socket.on("receive_message", (message: any) => {
        // Update messages if looking at this conversation
        if (
          selectedPartnerId &&
          (message.senderId === selectedPartnerId ||
            message.receiverId === selectedPartnerId)
        ) {
          setMessages((prev) => [...prev, message]);
        }

        // Update conversations list
        setConversations((prev) => {
          const newConvs = [...prev];
          const convIndex = newConvs.findIndex(
            (c) =>
              c.partner.id === message.senderId ||
              c.partner.id === message.receiverId
          );

          if (convIndex >= 0) {
            // Update existing conversation
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
                selectedPartnerId !== message.senderId
                  ? newConvs[convIndex].unreadCount + 1
                  : newConvs[convIndex].unreadCount,
            };
            // Move to top
            const [updatedConv] = newConvs.splice(convIndex, 1);
            newConvs.unshift(updatedConv);
          } else {
            // New conversation (would need to fetch partner details, for now we skip or could fetch)
            // Ideally we'd fetch the user info here if it's a brand new conversation
          }
          return newConvs;
        });
      });

      socket.on("user_typing", ({ senderId }) => {
        if (senderId === selectedPartnerId) {
          setIsTyping(true);
        }
      });

      socket.on("user_stop_typing", ({ senderId }) => {
        if (senderId === selectedPartnerId) {
          setIsTyping(false);
        }
      });

      return () => {
        socket.off("receive_message");
        socket.off("user_typing");
        socket.off("user_stop_typing");
        socket.disconnect();
      };
    }
  }, [session, selectedPartnerId]);

  // Fetch messages when selecting a partner
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedPartnerId) return;
      try {
        const { data } = await apiClient.get<{ messages: Message[] }>(
          `/messages/history/${selectedPartnerId}`
        );
        setMessages(data.messages);

        // Mark as read locally
        setConversations((prev) =>
          prev.map((c) => {
            if (c.partner.id === selectedPartnerId) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          })
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
    fileType?: string
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
        prev.filter((c) => c.partner.id !== partnerId)
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
              onlineUsers={new Set()}
              isLoading={isLoading}
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
              onBack={() => setSelectedPartnerId(null)}
              isMobile={
                typeof window !== "undefined" && window.innerWidth < 640
              }
            />
          </div>
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        onSelectUser={handleSelectUser}
        isMobile={typeof window !== "undefined" && window.innerWidth < 640}
      />
    </div>
  );
}
