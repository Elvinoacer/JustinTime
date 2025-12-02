"use client";

import { ChatWindow } from "@/components/client/messages/ChatWindow";
import { ConversationsList } from "@/components/client/messages/ConversationsList";
import { NewConversationModal } from "@/components/client/messages/NewConversationModal";
import apiClient from "@/lib/api/client";
import { socket } from "@/lib/socket";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";

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
}

export default function ProviderMessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track recently sent message IDs to prevent duplicates from socket
  const recentlySentIds = useRef<Set<string>>(new Set());

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
        const { data } = await apiClient.get<{ conversations: Conversation[] }>(
          "/messages/conversations"
        );
        setConversations(data.conversations);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      }
    };

    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  // Track selected partner ID in a ref to use in socket listener without re-binding
  const selectedPartnerIdRef = useRef<string | null>(selectedPartnerId);

  useEffect(() => {
    selectedPartnerIdRef.current = selectedPartnerId;
  }, [selectedPartnerId]);

  // Socket connection - Only run on session change
  useEffect(() => {
    if (session?.user) {
      console.log("Initializing socket connection for user:", session.user.id);
      socket.connect();
      socket.emit("join", session.user.id);

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      return () => {
        console.log("Cleaning up socket connection");
        socket.disconnect();
        socket.off("connect");
        socket.off("disconnect");
      };
    }
  }, [session]);

  // Socket event listeners - Run once and use refs for dynamic state
  useEffect(() => {
    if (!session?.user) return;

    const handleReceiveMessage = (message: any) => {
      console.log("Received socket message:", message);

      const currentPartnerId = selectedPartnerIdRef.current;

      // Emit delivered status if we are the receiver
      if (message.receiverId === session.user.id) {
        socket.emit("message_delivered", {
          messageId: message.id,
          senderId: message.senderId,
          receiverId: session.user.id,
        });

        // If we are looking at this conversation, emit read status too
        if (currentPartnerId === message.senderId) {
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
          // Ignore if this is a message we just sent (tracked in recentlySentIds)
          if (recentlySentIds.current.has(message.id)) {
            return prev;
          }

          // Check for existing message by ID
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;

          return [...prev, message];
        });
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
              currentPartnerId !== message.senderId
                ? newConvs[convIndex].unreadCount + 1
                : newConvs[convIndex].unreadCount,
          };
          // Move to top
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
      console.log(`User ${userId} came online`);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      if (userId === selectedPartnerIdRef.current) {
        const partner = conversations.find(
          (c) => c.partner.id === userId
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

    const handleMessageRead = ({
      messageId,
      receiverId,
    }: {
      messageId: string;
      receiverId: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m))
      );
    };

    const handleMessageDelivered = ({
      messageId,
      receiverId,
    }: {
      messageId: string;
      receiverId: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDelivered: true } : m))
      );
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("online_users_list", handleOnlineUsersList);
    socket.on("message_read", handleMessageRead);
    socket.on("message_delivered", handleMessageDelivered);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("message_read", handleMessageRead);
      socket.off("message_delivered", handleMessageDelivered);
    };
  }, [session]); // Only re-run if session changes (which is rare)

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

    // Track this message ID to prevent duplicates from socket
    recentlySentIds.current.add(tempId);

    // Immediately add to messages for instant UI feedback
    setMessages((prev) => [...prev, newMessage]);

    // Update conversations list immediately
    setConversations((prev) => {
      const newConvs = [...prev];
      const convIndex = newConvs.findIndex(
        (c) => c.partner.id === selectedPartnerId
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

    // Emit socket event for real-time delivery to other user
    socket.emit("send_message", {
      ...newMessage,
      receiverId: selectedPartnerId,
    });

    try {
      // Persist to DB and get the real message ID
      const response = await apiClient.post("/messages/send", {
        receiverId: selectedPartnerId,
        content,
        fileUrl,
        fileType,
      });

      // Update the temporary message with the real ID from the server
      if (response.data?.message?.id) {
        const realId = response.data.message.id;

        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: realId } : m))
        );

        // Add real ID to tracking and remove temp ID after a delay
        recentlySentIds.current.add(realId);
        recentlySentIds.current.delete(tempId);

        // Clean up tracking after 5 seconds
        setTimeout(() => {
          recentlySentIds.current.delete(realId);
        }, 5000);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      recentlySentIds.current.delete(tempId);
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
          role: contact.role,
          phone: contact.phone,
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

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  return (
    <div className="flex h-[calc(100dvh-64px)] sm:h-[calc(100vh-64px)] bg-gray-50 rounded-none sm:rounded-lg md:rounded-xl lg:rounded-2xl overflow-hidden shadow-xs sm:shadow-sm border-0 sm:border border-gray-200 m-0 sm:m-2 md:m-4">
      <div
        className={`${
          selectedPartnerId ? "hidden md:block" : "block"
        } w-full md:w-1/3 h-full`}
      >
        <ConversationsList
          conversations={conversations}
          selectedPartnerId={selectedPartnerId}
          onSelect={setSelectedPartnerId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewMessage={() => setIsNewConversationOpen(true)}
          onlineUsers={onlineUsers}
          isMobile={isMobile}
        />
      </div>
      <div
        className={`${
          !selectedPartnerId ? "hidden md:block" : "block"
        } w-full md:w-2/3 h-full`}
      >
        <ChatWindow
          partner={
            selectedPartnerId
              ? conversations.find((c) => c.partner.id === selectedPartnerId)
                  ?.partner || null
              : null
          }
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
      <NewConversationModal
        isOpen={isNewConversationOpen}
        onClose={() => setIsNewConversationOpen(false)}
        onSelectUser={handleSelectUser}
        isMobile={isMobile}
      />
    </div>
  );
}
