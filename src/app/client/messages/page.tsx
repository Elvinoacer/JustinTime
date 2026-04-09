"use client";

import { ChatWindow } from "@/components/client/messages/ChatWindow";
import { ConversationsList } from "@/components/client/messages/ConversationsList";
import { NewConversationModal } from "@/components/client/messages/NewConversationModal";
import apiClient from "@/lib/api/client";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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
  clientTempId?: string;
}

interface SocketMessage extends Message {
  receiverId: string;
  sender?: {
    id: string;
    name: string | null;
    image: string | null;
    role?: string;
    phone?: string | null;
  };
  receiver?: {
    id: string;
    name: string | null;
    image: string | null;
    role?: string;
    phone?: string | null;
  };
}

interface Contact {
  id: string;
  name: string | null;
  image: string | null;
}

function ClientMessagesContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
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
  const deepLinkPartnerId = searchParams.get("partnerId");
  const deepLinkPartnerName = searchParams.get("partnerName");
  const deepLinkPartnerImage = searchParams.get("partnerImage");

  const ensureDeepLinkConversation = useCallback(
    (items: Conversation[]) => {
      if (!deepLinkPartnerId) return items;

      const exists = items.some((c) => c.partner.id === deepLinkPartnerId);
      if (exists) return items;

      const starterConversation: Conversation = {
        partner: {
          id: deepLinkPartnerId,
          name: deepLinkPartnerName || "Conversation",
          image: deepLinkPartnerImage || null,
        },
        lastMessage: {
          content: "",
          createdAt: new Date().toISOString(),
          isRead: true,
          isOwn: false,
        },
        unreadCount: 0,
      };

      return [starterConversation, ...items];
    },
    [deepLinkPartnerId, deepLinkPartnerImage, deepLinkPartnerName],
  );

  useEffect(() => {
    selectedPartnerIdRef.current = selectedPartnerId;
  }, [selectedPartnerId]);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
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
        setConversations(ensureDeepLinkConversation(data.conversations));
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchConversations();
    }
  }, [ensureDeepLinkConversation, session]);

  useEffect(() => {
    if (!deepLinkPartnerId) return;

    setSelectedPartnerId(deepLinkPartnerId);

    setConversations((prev) => ensureDeepLinkConversation(prev));
  }, [deepLinkPartnerId, ensureDeepLinkConversation]);

  // Socket connection and listeners
  useEffect(() => {
    if (!session?.user) return;

    socket.connect();
    socket.emit("join", session.user.id);

    const handleReceiveMessage = (message: SocketMessage) => {
      const activePartnerId = selectedPartnerIdRef.current;

      if (message.receiverId === session.user.id) {
        void apiClient
          .post("/messages/delivered", { messageId: message.id })
          .catch((error) => {
            console.error("Failed to persist delivery receipt:", error);
          });

        socket.emit("message_delivered", {
          messageId: message.id,
          senderId: message.senderId,
          receiverId: session.user.id,
        });

        if (activePartnerId === message.senderId) {
          void apiClient
            .post("/messages/read", { messageId: message.id })
            .catch((error) => {
              console.error("Failed to persist read receipt:", error);
            });

          socket.emit("message_read", {
            messageId: message.id,
            senderId: message.senderId,
            receiverId: session.user.id,
          });
        }
      }

      if (
        activePartnerId &&
        (message.senderId === activePartnerId ||
          message.receiverId === activePartnerId)
      ) {
        setMessages((prev) => {
          const existingById = prev.some((item) => item.id === message.id);
          if (existingById) {
            return prev;
          }

          if (message.senderId === session.user.id && message.clientTempId) {
            const tempIndex = prev.findIndex(
              (item) => item.id === message.clientTempId,
            );

            if (tempIndex >= 0) {
              const next = [...prev];
              next[tempIndex] = {
                ...next[tempIndex],
                ...message,
                id: message.id,
                clientTempId: undefined,
              };
              return next;
            }
          }

          return [...prev, message];
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
        } else {
          const partnerFromMessage =
            message.senderId === session.user.id
              ? message.receiver
              : message.sender;
          const partnerId =
            message.senderId === session.user.id
              ? message.receiverId
              : message.senderId;

          newConvs.unshift({
            partner: {
              id: partnerId,
              name: partnerFromMessage?.name || "Conversation",
              image: partnerFromMessage?.image || null,
            },
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              isRead: false,
              isOwn: message.senderId === session.user.id,
            },
            unreadCount:
              message.senderId !== session.user.id &&
              activePartnerId !== message.senderId
                ? 1
                : 0,
          });
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

    const handleMessageDelivered = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, isDelivered: true }
            : message,
        ),
      );
    };

    const handleMessageRead = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, isRead: true, isDelivered: true }
            : message,
        ),
      );
    };

    const handleMessagesRead = ({ messageIds }: { messageIds?: string[] }) => {
      if (!messageIds || messageIds.length === 0) return;
      const idSet = new Set(messageIds);
      setMessages((prev) =>
        prev.map((message) =>
          idSet.has(message.id)
            ? { ...message, isRead: true, isDelivered: true }
            : message,
        ),
      );
    };

    const handleConversationCleared = ({
      clearedById,
      partnerId,
    }: {
      clearedById?: string;
      partnerId?: string | null;
    }) => {
      if (clearedById !== session.user.id || !partnerId) {
        return;
      }

      setConversations((prev) =>
        prev.filter((conversation) => conversation.partner.id !== partnerId),
      );

      if (selectedPartnerIdRef.current === partnerId) {
        setMessages([]);
        setSelectedPartnerId(null);
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("online_users_list", handleOnlineUsersList);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("message_read", handleMessageRead);
    socket.on("messages_read", handleMessagesRead);
    socket.on("conversation_cleared", handleConversationCleared);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("message_read", handleMessageRead);
      socket.off("messages_read", handleMessagesRead);
      socket.off("conversation_cleared", handleConversationCleared);
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

  const emitTypingStart = useCallback(() => {
    if (!selectedPartnerId || !session?.user?.id) return;
    socket.emit("typing", {
      senderId: session.user.id,
      receiverId: selectedPartnerId,
    });
  }, [selectedPartnerId, session?.user?.id]);

  const emitTypingStop = useCallback(() => {
    if (!selectedPartnerId || !session?.user?.id) return;
    socket.emit("stop_typing", {
      senderId: session.user.id,
      receiverId: selectedPartnerId,
    });
  }, [selectedPartnerId, session?.user?.id]);

  const handleSendMessage = async (
    content: string,
    fileUrl?: string,
    fileType?: string,
  ) => {
    if (!selectedPartnerId || !session?.user) return;

    // Optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newMessage = {
      id: tempId,
      senderId: session.user.id,
      content,
      fileUrl,
      fileType,
      createdAt: new Date().toISOString(),
      isRead: false,
      isDelivered: false,
      clientTempId: tempId,
    };

    // Add to messages immediately for instant feedback
    setMessages((prev) => [...prev, newMessage]);

    setConversations((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex(
        (conversation) => conversation.partner.id === selectedPartnerId,
      );

      if (existingIndex === -1) {
        return prev;
      }

      next[existingIndex] = {
        ...next[existingIndex],
        lastMessage: {
          content: content || (fileUrl ? "Sent an attachment" : ""),
          createdAt: newMessage.createdAt,
          isRead: false,
          isOwn: true,
        },
      };

      const [activeConversation] = next.splice(existingIndex, 1);
      next.unshift(activeConversation);
      return next;
    });

    try {
      // Persist to DB
      const { data } = await apiClient.post<{ message: Message }>(
        "/messages/send",
        {
          receiverId: selectedPartnerId,
          content,
          fileUrl,
          fileType,
          clientTempId: tempId,
        },
      );

      if (data?.message?.id) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId
              ? {
                  ...message,
                  ...data.message,
                  id: data.message.id,
                  clientTempId: undefined,
                }
              : message,
          ),
        );
      }
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
    const previousMessages = messages;
    const previousConversations = conversations;
    const previousSelectedPartnerId = selectedPartnerId;

    setMessages([]);
    setConversations((prev) => prev.filter((c) => c.partner.id !== partnerId));
    if (selectedPartnerId === partnerId) {
      setSelectedPartnerId(null);
    }

    try {
      await apiClient.delete(`/messages/clear/${partnerId}`);
    } catch (error) {
      console.error("Failed to clear conversation:", error);
      setMessages(previousMessages);
      setConversations(previousConversations);
      setSelectedPartnerId(previousSelectedPartnerId);
    }
  };

  const handleSelectUser = (contact: Contact) => {
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
    <div className="h-[calc(100dvh-64px)] md:h-[calc(100dvh-80px)] overflow-hidden bg-gray-50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto h-full min-h-0 px-0 md:px-4">
        <div className="flex h-full min-h-0 bg-white rounded-none md:rounded-2xl overflow-hidden shadow-none md:shadow-sm border-0 md:border border-gray-200 mt-0 md:mt-4">
          {/* Conversations List */}
          <div
            className={`h-full min-h-0 overflow-hidden transition-all duration-200 ${
              selectedPartnerId
                ? "hidden md:block md:w-5/12 lg:w-1/3 xl:w-[32%]"
                : "w-full md:w-5/12 lg:w-1/3 xl:w-[32%]"
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
            className={`h-full min-h-0 overflow-hidden transition-all duration-200 ${
              selectedPartnerId
                ? "w-full md:w-7/12 lg:w-2/3 xl:w-[68%]"
                : "hidden md:block md:w-7/12 lg:w-2/3 xl:w-[68%]"
            }`}
          >
            <ChatWindow
              partner={selectedPartner}
              messages={messages}
              currentUserId={session?.user?.id || ""}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onClearConversation={handleClearConversation}
              onTypingStart={emitTypingStart}
              onTypingStop={emitTypingStop}
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
  return (
    <Suspense fallback={null}>
      <ClientMessagesContent />
    </Suspense>
  );
}
