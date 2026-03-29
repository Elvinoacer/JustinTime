"use client";

import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { toggleCall } from "@/components/communication/CallOverlay";
import { Phone, Video as VideoIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSecurityBanner } from "@/components/communication/MessageSecurityBanner";
import { ReportUserModal } from "@/components/communication/ReportUserModal";
import { CallHistoryDrawer } from "@/components/communication/CallHistoryDrawer";

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

interface ChatWindowProps {
  partner: {
    id: string;
    name: string;
    image: string | null;
    role?: string;
    phone?: string;
  } | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (
    content: string,
    fileUrl?: string,
    fileType?: string
  ) => Promise<void>;
  isTyping?: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onClearConversation?: (partnerId: string) => void;
  isOnline?: boolean;
  onBack?: () => void;
  isMobile?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  partner,
  messages,
  currentUserId,
  onSendMessage,
  isTyping = false,
  onDeleteMessage,
  onClearConversation,
  isOnline = false,
  onBack,
  isMobile = false,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<{
    file: File;
    url: string;
    type: "image" | "file";
  } | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !filePreview) || isUploading) return;

    try {
      setIsUploading(true);
      let fileUrl = undefined;
      let fileType = undefined;

      if (filePreview) {
        const formData = new FormData();
        formData.append("file", filePreview.file);
        formData.append("upload_preset", "ml_default");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const data = await response.json();
        fileUrl = data.url;
        fileType = filePreview.type;
      }

      await onSendMessage(newMessage, fileUrl, fileType);
      setNewMessage("");
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (1MB limit)
    if (file.size > 1024 * 1024) {
      alert("File size exceeds 1MB limit. Please choose a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const fileType = file.type.startsWith("image/") ? "image" : "file";
    const previewUrl = URL.createObjectURL(file);

    setFilePreview({ file, url: previewUrl, type: fileType });
  };

  const handleCancelPreview = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview.url);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!partner) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 h-full text-gray-400 p-4">
        <span
          className={`material-symbols-outlined mb-4 text-gray-300 ${
            isMobile ? "text-4xl" : "text-6xl"
          }`}
        >
          chat_bubble_outline
        </span>
        <p
          className={`text-center font-medium ${
            isMobile ? "text-base" : "text-lg"
          }`}
        >
          Select a conversation to start messaging
        </p>
        <p className="text-xs sm:text-sm text-gray-500 text-center mt-2 max-w-md">
          Choose from your existing conversations or start a new one
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {/* Chat Header */}
      <div
        className={`sticky top-0 border-b border-gray-200/80 bg-white/95 backdrop-blur-md flex justify-between items-center shadow-sm z-10 ${
          isMobile ? "p-3" : "p-4"
        }`}
      >
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className={`${
                isMobile ? "mr-1" : "mr-2"
              } p-2 -ml-2 text-gray-500 hover:bg-gray-100 active:bg-gray-200 rounded-full touch-manipulation`}
              aria-label="Back to conversations"
            >
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
            </button>
          )}
          <div className="relative">
            {partner.image ? (
              <img
                src={partner.image}
                alt={partner.name}
                className={`rounded-full object-cover border border-gray-200 ${
                  isMobile ? "h-8 w-8" : "h-10 w-10"
                }`}
              />
            ) : (
              <div
                className={`rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200 ${
                  isMobile ? "h-8 w-8 text-sm" : "h-10 w-10"
                }`}
              >
                {partner.name.charAt(0)}
              </div>
            )}
            {isOnline && (
              <span
                className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white bg-green-400 ${
                  isMobile ? "h-2 w-2" : "h-2.5 w-2.5"
                }`}
              />
            )}
          </div>
          <div className="min-w-0">
            <h3
              className={`font-bold text-gray-900 truncate ${
                isMobile ? "text-sm" : "text-lg"
              }`}
            >
              {partner.name}
            </h3>
            <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500">
              {isTyping ? (
                <span className="text-emerald-600 font-medium animate-pulse text-xs">
                  Typing...
                </span>
              ) : isOnline ? (
                <span className="text-green-500 font-medium text-xs">
                  Online
                </span>
              ) : (
                <>
                  {partner.role && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium text-[10px] sm:text-xs ${
                        partner.role === "PROVIDER"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {partner.role}
                    </span>
                  )}
                  {partner.phone && !isMobile && (
                    <span className="hidden sm:flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">
                        phone
                      </span>
                      {partner.phone}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() =>
              partner && toggleCall(partner.id, partner.name, partner.image, "AUDIO")
            }
            className="inline-flex items-center gap-1.5 p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-full sm:rounded-lg transition-colors touch-manipulation"
            title="Voice Call"
            aria-label="Start voice call"
          >
            <Phone className="w-5 h-5" />
            <span className="hidden md:inline text-xs font-semibold">Call</span>
          </button>
          <button
            onClick={() =>
              partner && toggleCall(partner.id, partner.name, partner.image, "VIDEO")
            }
            className="inline-flex items-center gap-1.5 p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-full sm:rounded-lg transition-colors touch-manipulation"
            title="Video Call"
            aria-label="Start video call"
          >
            <VideoIcon className="w-5 h-5" />
            <span className="hidden md:inline text-xs font-semibold">Video</span>
          </button>
           
           <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            aria-label="More options"
          >
            <span className="material-symbols-outlined text-lg">more_vert</span>
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
                aria-hidden="true"
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 sm:mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                <button
                  className="w-full text-left px-4 py-2.5 sm:py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-2 touch-manipulation"
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Are you sure you want to clear this conversation? This action cannot be undone."
                      )
                    ) {
                      setShowMenu(false);
                      onClearConversation &&
                        partner &&
                        onClearConversation(partner.id);
                    } else {
                      setShowMenu(false);
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-gray-400 text-sm">
                    delete_sweep
                  </span>
                  Clear Chat
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 sm:py-2 text-sm text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 flex items-center gap-2 touch-manipulation"
                  onClick={() => {
                    setShowMenu(false);
                    setShowCallHistory(true);
                  }}
                >
                  <span className="material-symbols-outlined text-emerald-400 text-sm">
                    history
                  </span>
                  Call History
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 sm:py-2 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-2 touch-manipulation"
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                >
                  <span className="material-symbols-outlined text-red-400 text-sm">
                    report
                  </span>
                  Report User
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <MessageSecurityBanner 
        onReportUser={() => setShowReportModal(true)} 
        onOpenSafety={() => {
          const basePath = pathname?.startsWith('/client') ? '/client' : '/dashboard';
          router.push(`${basePath}/safety`);
        }} 
        partnerName={partner.name} 
      />

      {/* Messages List */}
      <div
        className={`flex-1 overflow-y-auto bg-gray-50 ${
          isMobile ? "p-3 space-y-3" : "p-4 sm:p-5 space-y-4"
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="material-symbols-outlined text-4xl sm:text-5xl mb-3 sm:mb-4 text-gray-300">
              chat
            </span>
            <p
              className={`text-gray-500 text-center ${
                isMobile ? "text-sm" : "text-base"
              }`}
            >
              No messages yet
            </p>
            <p className="text-xs text-gray-400 mt-1 text-center">
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = msg.senderId === currentUserId;
              const showTime =
                index === 0 ||
                new Date(msg.createdAt).getTime() -
                  new Date(messages[index - 1].createdAt).getTime() >
                  5 * 60 * 1000;

              return (
                <React.Fragment key={msg.id || index}>
                  {showTime && (
                    <div className="flex justify-center my-3 sm:my-4">
                      <span
                        className={`text-gray-400 bg-gray-100 px-2 py-1 rounded-full ${
                          isMobile ? "text-[10px]" : "text-xs"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                        {", "}
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    } relative`}
                  >
                    <div
                      className={`relative group ${
                        isMobile ? "max-w-[85%]" : "max-w-[70%] sm:max-w-[75%]"
                      }`}
                    >
                      {isOwn && (
                        <button
                          onClick={() =>
                            onDeleteMessage && onDeleteMessage(msg.id)
                          }
                          className="opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-full mr-1 sm:mr-2 p-1 text-gray-300 hover:text-red-500 transition-all bg-white rounded-full shadow-sm hover:shadow-md touch-manipulation"
                          title="Delete message"
                        >
                          <span className="material-symbols-outlined text-xs">
                            delete
                          </span>
                        </button>
                      )}
                      <div
                        className={`shadow-sm ${
                          isMobile
                            ? "p-2.5 rounded-xl text-xs"
                            : "p-3 rounded-2xl text-sm"
                        } ${
                          isOwn
                            ? "bg-emerald-600 text-white rounded-tr-none"
                            : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                        }`}
                      >
                        {msg.fileUrl &&
                          (msg.fileType === "image" ||
                            msg.fileUrl.match(
                              /\.(jpg|jpeg|png|gif|webp)$/i
                            )) && (
                            <div className="mb-2">
                              <img
                                src={msg.fileUrl}
                                alt="Shared image"
                                className="rounded-lg w-full object-cover cursor-pointer hover:opacity-95 transition-opacity touch-manipulation"
                                onClick={() =>
                                  window.open(msg.fileUrl!, "_blank")
                                }
                                loading="lazy"
                              />
                            </div>
                          )}
                        {msg.fileUrl &&
                          msg.fileType !== "image" &&
                          !msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                            <div className="mb-2">
                              <a
                                href={msg.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 sm:gap-3 rounded-xl transition-colors border ${
                                  isOwn
                                    ? "bg-emerald-700/50 hover:bg-emerald-700 border-emerald-500/30"
                                    : "bg-gray-100 hover:bg-gray-200 border-gray-200"
                                } ${isMobile ? "p-2" : "p-3"}`}
                              >
                                <div
                                  className={`rounded-lg flex items-center justify-center ${
                                    isMobile ? "w-8 h-8" : "w-10 h-10"
                                  } ${
                                    isOwn ? "bg-emerald-800/50" : "bg-white"
                                  }`}
                                >
                                  {msg.fileUrl.endsWith(".pdf") ? (
                                    <span className="material-symbols-outlined text-red-400">
                                      picture_as_pdf
                                    </span>
                                  ) : msg.fileUrl.match(/\.(doc|docx)$/) ? (
                                    <span className="material-symbols-outlined text-blue-400">
                                      description
                                    </span>
                                  ) : (
                                    <span className="material-symbols-outlined text-gray-400">
                                      insert_drive_file
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`font-medium truncate opacity-90 ${
                                      isMobile ? "text-[10px]" : "text-xs"
                                    }`}
                                  >
                                    Attachment
                                  </p>
                                  <p
                                    className={`opacity-70 uppercase ${
                                      isMobile ? "text-[9px]" : "text-[10px]"
                                    }`}
                                  >
                                    {msg.fileUrl.split(".").pop()}
                                  </p>
                                </div>
                                <span className="material-symbols-outlined text-sm opacity-70">
                                  open_in_new
                                </span>
                              </a>
                            </div>
                          )}
                        {msg.content && (
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {msg.content}
                          </p>
                        )}
                        <div
                          className={`mt-1 text-right flex items-center justify-end gap-1 ${
                            isOwn ? "text-emerald-100" : "text-gray-400"
                          } ${isMobile ? "text-[9px]" : "text-[10px]"}`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {isOwn && (
                            <span
                              className="flex items-center"
                              title={
                                msg.isRead
                                  ? "Read"
                                  : msg.isDelivered
                                  ? "Delivered"
                                  : "Sent"
                              }
                            >
                              {msg.isRead ? (
                                <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-blue-200 font-bold">
                                  done_all
                                </span>
                              ) : msg.isDelivered ? (
                                <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-emerald-200 font-bold">
                                  done_all
                                </span>
                              ) : (
                                <span className="material-symbols-outlined text-[14px] sm:text-[16px] opacity-70">
                                  check
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
          </>
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div
              className={`bg-white border border-gray-100 shadow-sm ${
                isMobile
                  ? "p-2 rounded-xl rounded-tl-none"
                  : "p-3 rounded-2xl rounded-tl-none"
              }`}
            >
              <div className="flex space-x-1">
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {filePreview && (
        <div
          className={`border-t border-gray-200 bg-gray-50 ${
            isMobile ? "p-3" : "p-4"
          }`}
        >
          <div
            className={`flex items-start gap-3 bg-white border border-gray-200 shadow-sm rounded-xl ${
              isMobile ? "p-2" : "p-3"
            }`}
          >
            {filePreview.type === "image" ? (
              <img
                src={filePreview.url}
                alt="Preview"
                className={`rounded-lg object-cover border border-gray-200 ${
                  isMobile ? "w-12 h-12" : "w-16 h-16"
                }`}
              />
            ) : (
              <div
                className={`rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 ${
                  isMobile ? "w-12 h-12" : "w-16 h-16"
                }`}
              >
                <span className="material-symbols-outlined text-gray-400 text-2xl sm:text-3xl">
                  description
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium text-gray-900 truncate ${
                  isMobile ? "text-xs" : "text-sm"
                }`}
              >
                {filePreview.file.name}
              </p>
              <p
                className={`text-gray-500 ${
                  isMobile ? "text-[10px]" : "text-xs"
                }`}
              >
                {(filePreview.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={handleCancelPreview}
              className={`text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ${
                isMobile ? "p-1" : "p-1.5"
              }`}
              title="Remove file"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div
        className={`border-t border-gray-200 bg-white/95 backdrop-blur-sm ${
          isMobile ? "p-3" : "p-4"
        }`}
      >
        <form
          onSubmit={handleSend}
          className={`flex items-center rounded-2xl border border-gray-200 bg-white shadow-sm ${
            isMobile ? "gap-2 px-2 py-1.5" : "gap-3 px-3 py-2"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors touch-manipulation ${
              isUploading ? "animate-pulse" : ""
            } ${isMobile ? "p-1.5" : "p-2"}`}
            aria-label="Attach file"
          >
            <span className="material-symbols-outlined text-lg">
              attach_file
            </span>
          </button>
          <input
            type="text"
            placeholder={
              filePreview ? "Add a caption (optional)..." : "Type a message..."
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className={`flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 transition-all text-gray-900 placeholder:text-gray-400 ${
              isMobile ? "px-2 py-2 text-sm" : "px-2 py-2.5"
            }`}
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !filePreview) || isUploading}
            className={`text-white transition-all touch-manipulation ${
              (newMessage.trim() || filePreview) && !isUploading
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm hover:shadow-md"
                : "bg-gray-300 cursor-not-allowed"
            } ${isMobile ? "p-2.5 rounded-lg" : "p-3 rounded-xl"}`}
            aria-label="Send message"
          >
            {isUploading ? (
              <div
                className={`border-2 border-white border-t-transparent rounded-full animate-spin ${
                  isMobile ? "w-4 h-4" : "w-5 h-5"
                }`}
              />
            ) : (
              <span className="material-symbols-outlined text-lg">send</span>
            )}
          </button>
        </form>
      </div>

      <ReportUserModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
        reportedId={partner.id} 
        partnerName={partner.name} 
      />

      <CallHistoryDrawer 
        isOpen={showCallHistory} 
        onClose={() => setShowCallHistory(false)} 
        partnerId={partner.id} 
        partnerName={partner.name} 
      />
    </div>
  );
};
