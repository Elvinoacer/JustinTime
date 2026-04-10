"use client";

import { ChatWindow } from "@/components/client/messages/ChatWindow";
import { ConversationsList } from "@/components/client/messages/ConversationsList";
import { NewConversationModal } from "@/components/client/messages/NewConversationModal";
import apiClient from "@/lib/api/client";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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
  role?: string;
  phone?: string | null;
}

export const dynamic = "force-dynamic";

function ProviderMessagesContent() {
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

  // Check if mobile on mount and resize
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
    } else {
      setIsLoading(false);
    }
  }, [ensureDeepLinkConversation, session]);

  useEffect(() => {
    if (!deepLinkPartnerId) return;

    setSelectedPartnerId(deepLinkPartnerId);
    setConversations((prev) => ensureDeepLinkConversation(prev));
  }, [deepLinkPartnerId, ensureDeepLinkConversation]);

  // Track selected partner ID in a ref to use in socket listener without re-binding
  const selectedPartnerIdRef = useRef<string | null>(selectedPartnerId);
  const conversationsRef = useRef<Conversation[]>(conversations);

  useEffect(() => {
    selectedPartnerIdRef.current = selectedPartnerId;
  }, [selectedPartnerId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Socket connection - Only run on session change
  useEffect(() => {
    if (session?.user) {
      console.log("Initializing socket connection for user:", session.user.id);
      socket.connect();
      socket.emit("join", session.user.id);

      const handleConnect = () => {
        console.log("✅ Socket connected:", socket.id);
        // Re-join room on reconnection
        socket.emit("join", session.user.id);
      };

      const handleConnectError = (err: Error) => {
        console.error("❌ Socket connection error:", err.message);
      };

      const handleReconnectAttempt = (attemptNumber: number) => {
        console.log(`🔄 Reconnection attempt #${attemptNumber}...`);
      };

      const handleReconnect = (attemptNumber: number) => {
        console.log(`✅ Reconnected after ${attemptNumber} attempts`);
        // Re-join room after reconnection
        socket.emit("join", session.user.id);
      };

      const handleReconnectFailed = () => {
        console.error("❌ Reconnection failed");
      };

      const handleDisconnect = (reason: string) => {
        console.log("🔌 Socket disconnected:", reason);
        if (reason === "io server disconnect") {
          // Server disconnected, manually reconnect
          socket.connect();
        }
      };

      socket.on("connect", handleConnect);
      socket.on("connect_error", handleConnectError);
      socket.on("reconnect_attempt", handleReconnectAttempt);
      socket.on("reconnect", handleReconnect);
      socket.on("reconnect_failed", handleReconnectFailed);
      socket.on("disconnect", handleDisconnect);

      // Keep-alive ping every 25 seconds to prevent Render sleep
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("ping");
        }
      }, 25000);

      return () => {
        console.log("Cleaning up socket connection");
        clearInterval(pingInterval);
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleConnectError);
        socket.off("reconnect_attempt", handleReconnectAttempt);
        socket.off("reconnect", handleReconnect);
        socket.off("reconnect_failed", handleReconnectFailed);
        socket.off("disconnect", handleDisconnect);
      };
    }
  }, [session]);

  // Socket event listeners - Run once and use refs for dynamic state
  useEffect(() => {
    if (!session?.user) return;

    const handleReceiveMessage = (message: SocketMessage) => {
      console.log("Received socket message:", message);

      const currentPartnerId = selectedPartnerIdRef.current;

      // Emit delivered status if we are the receiver
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

        // If we are looking at this conversation, emit read status too
        if (currentPartnerId === message.senderId) {
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

      // Update messages if looking at this conversation
      if (
        currentPartnerId &&
        (message.senderId === currentPartnerId ||
          message.receiverId === currentPartnerId)
      ) {
        setMessages((prev) => {
          const existingById = prev.some((m) => m.id === message.id);
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

      // Update conversations list
      setConversations((prev) => {
        const newConvs = [...prev];
        const convIndex = newConvs.findIndex(
          (c) =>
            c.partner.id === message.senderId ||
            c.partner.id === message.receiverId,
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
              currentPartnerId !== message.senderId
                ? newConvs[convIndex].unreadCount + 1
                : newConvs[convIndex].unreadCount,
          };
          // Move to top
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
              role: partnerFromMessage?.role,
              ...(partnerFromMessage?.phone
                ? { phone: partnerFromMessage.phone }
                : {}),
            },
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              isRead: false,
              isOwn: message.senderId === session.user.id,
            },
            unreadCount:
              message.senderId !== session.user.id &&
              currentPartnerId !== message.senderId
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
      console.log(`User ${userId} came online`);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      if (userId === selectedPartnerIdRef.current) {
        const partner = conversationsRef.current.find(
          (c) => c.partner.id === userId,
        )?.partner;
        if (partner) {
          console.log(`${partner.name} went offline`);
        }
      }
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const handleOnlineUsersList = ({ userIds }: { userIds: string[] }) => {
      console.log("Received online users list:", userIds);
      setOnlineUsers(new Set(userIds));
    };

    const handleMessageRead = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)),
      );
    };

    const handleMessageDelivered = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDelivered: true } : m)),
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
    socket.on("message_read", handleMessageRead);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("messages_read", handleMessagesRead);
    socket.on("conversation_cleared", handleConversationCleared);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("message_read", handleMessageRead);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("messages_read", handleMessagesRead);
      socket.off("conversation_cleared", handleConversationCleared);
    };
  }, [session]); // Only re-run if session changes (which is rare)

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

    // Immediately add to messages for instant UI feedback
    setMessages((prev) => [...prev, newMessage]);

    // Update conversations list immediately
    setConversations((prev) => {
      const newConvs = [...prev];
      const convIndex = newConvs.findIndex(
        (c) => c.partner.id === selectedPartnerId,
      );

      if (convIndex >= 0) {
        // Update existing conversation
        newConvs[convIndex] = {
          ...newConvs[convIndex],
          lastMessage: {
            content: content || (fileUrl ? "Sent a file" : ""),
            createdAt: newMessage.createdAt,
            isRead: false,
            isOwn: true,
          },
        };
        // Move to top
        const [updatedConv] = newConvs.splice(convIndex, 1);
        newConvs.unshift(updatedConv);
      }
      return newConvs;
    });

    try {
      // Persist to DB and get the real message ID
      const response = await apiClient.post("/messages/send", {
        receiverId: selectedPartnerId,
        content,
        fileUrl,
        fileType,
        clientTempId: tempId,
      });

      // Update the temporary message with the real ID from the server
      if (response.data?.message?.id) {
        const realId = response.data.message.id;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  ...response.data.message,
                  id: realId,
                  clientTempId: undefined,
                }
              : m,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("Failed to send message. Please try again.");
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
          role: contact.role,
          ...(contact.phone ? { phone: contact.phone } : {}),
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
    <div className="h-[calc(100dvh-64px-var(--dashboard-mobile-bottom-nav-offset,0px))] md:h-[calc(100dvh-80px)] overflow-hidden bg-gray-50">
      <div className="max-w-7xl mx-auto h-full min-h-0 px-0 md:px-4">
        <div className="flex h-full min-h-0 bg-white rounded-none md:rounded-2xl overflow-hidden shadow-none md:shadow-sm border-0 md:border border-gray-200 mt-0 md:mt-4">
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

      <NewConversationModal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        onSelectUser={handleSelectUser}
        isMobile={isMobile}
      />
    </div>
  );
}

export default function ProviderMessagesPage() {
  return (
    <Suspense fallback={null}>
      <ProviderMessagesContent />
    </Suspense>
  );
}
