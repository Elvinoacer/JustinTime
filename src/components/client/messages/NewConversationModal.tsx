"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import apiClient from "@/lib/api/client";

interface Contact {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  phone: string | null;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (contact: Contact) => void;
  isMobile?: boolean;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  isMobile = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setContacts([]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Fetch recent contacts (last 5 contacted users)
    const fetchRecentContacts = async () => {
      try {
        const { data } = await apiClient.get<{ contacts: Contact[] }>(
          "/messages/recent-contacts",
        );
        setRecentContacts(data.contacts);
      } catch (error) {
        console.error("Failed to fetch recent contacts:", error);
      }
    };

    if (isOpen) {
      fetchRecentContacts();
    }
  }, [isOpen]);

  useEffect(() => {
    const searchContacts = async () => {
      if (searchQuery.length < 2) {
        setContacts([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data } = await apiClient.get<{ contacts: Contact[] }>(
          `/messages/contacts?search=${encodeURIComponent(searchQuery)}`,
        );
        setContacts(data.contacts);
      } catch (error) {
        console.error("Failed to search contacts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${
          isMobile ? "p-0" : "p-3 sm:p-4"
        }`}
      >
        <motion.div
          initial={{
            opacity: 0,
            y: isMobile ? 100 : 0,
            scale: isMobile ? 1 : 0.95,
          }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: isMobile ? 100 : 0,
            scale: isMobile ? 1 : 0.95,
          }}
          transition={{
            type: isMobile ? "spring" : "tween",
            damping: 25,
            stiffness: 300,
          }}
          className={`bg-white shadow-xl overflow-hidden w-full ${
            isMobile
              ? "rounded-t-3xl rounded-b-none h-[85vh] max-h-[85vh] mt-auto"
              : "rounded-xl sm:rounded-2xl max-w-md max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div
            className={`border-b border-gray-100 flex justify-between items-center bg-white ${
              isMobile ? "p-4" : "p-4 sm:p-5"
            } sticky top-0 z-10`}
          >
            <div>
              <h2
                className={`font-bold text-gray-900 ${
                  isMobile ? "text-lg" : "text-lg sm:text-xl"
                }`}
              >
                New Conversation
              </h2>
              <p
                className={`text-gray-500 ${
                  isMobile ? "text-xs mt-0.5" : "text-sm mt-1"
                }`}
              >
                Search for a user to start messaging
              </p>
            </div>
            <button
              onClick={onClose}
              className={`text-gray-400 hover:text-gray-600 active:text-gray-700 rounded-full p-1 transition-colors touch-manipulation ${
                isMobile ? "p-2 -mr-2" : ""
              }`}
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Content */}
          <div
            className={`overflow-y-auto ${
              isMobile ? "h-[calc(85vh-73px)]" : "max-h-[calc(85vh-80px)]"
            }`}
          >
            <div className={`${isMobile ? "p-4" : "p-4 sm:p-5"}`}>
              {/* Search Input */}
              <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-lg">
                    search
                  </span>
                </span>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 transition-all ${
                    isMobile
                      ? "py-2.5 text-sm rounded-lg"
                      : "py-3 text-sm sm:text-base rounded-xl"
                  }`}
                  autoFocus={!isMobile}
                />
              </div>

              {/* Recent Contacts (when not searching) */}
              {searchQuery.length < 2 && recentContacts.length > 0 && (
                <div className="mb-6">
                  <h3
                    className={`font-semibold text-gray-700 mb-3 ${
                      isMobile ? "text-sm" : "text-sm sm:text-base"
                    }`}
                  >
                    Recent Contacts
                  </h3>
                  <ul className="space-y-2">
                    {recentContacts.slice(0, 5).map((contact) => (
                      <li
                        key={contact.id}
                        onClick={() => {
                          onSelectUser(contact);
                          onClose();
                        }}
                        className="flex items-center p-3 hover:bg-gray-50 active:bg-gray-100 rounded-lg sm:rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100 touch-manipulation"
                      >
                        {contact.image ? (
                          <Image
                            src={contact.image}
                            alt={contact.name || "User"}
                            width={isMobile ? 40 : 44}
                            height={isMobile ? 40 : 44}
                            unoptimized
                            className={`rounded-full object-cover border border-gray-200 ${
                              isMobile ? "w-10 h-10" : "w-11 h-11"
                            }`}
                          />
                        ) : (
                          <div
                            className={`rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200 ${
                              isMobile ? "w-10 h-10 text-base" : "w-11 h-11"
                            }`}
                          >
                            {(contact.name || "?").charAt(0)}
                          </div>
                        )}
                        <div className="ml-3 flex-1 min-w-0">
                          <p
                            className={`font-bold text-gray-900 truncate ${
                              isMobile ? "text-sm" : "text-base"
                            }`}
                          >
                            {contact.name || "Unknown User"}
                          </p>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                            <span
                              className={`rounded-md font-medium truncate ${
                                contact.role === "PROVIDER"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              } ${
                                isMobile
                                  ? "text-[10px] px-1.5 py-0.5"
                                  : "text-xs px-2 py-0.5"
                              }`}
                            >
                              {contact.role}
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-300 text-lg">
                          arrow_forward
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Search Results */}
              <div>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div
                      className={`border-2 border-emerald-500 border-t-transparent rounded-full animate-spin ${
                        isMobile ? "w-5 h-5" : "w-6 h-6"
                      }`}
                    />
                  </div>
                ) : searchQuery.length >= 2 && contacts.length > 0 ? (
                  <>
                    <h3
                      className={`font-semibold text-gray-700 mb-3 ${
                        isMobile ? "text-sm" : "text-sm sm:text-base"
                      }`}
                    >
                      Search Results
                    </h3>
                    <ul className="space-y-2">
                      {contacts.map((contact) => (
                        <li
                          key={contact.id}
                          onClick={() => {
                            onSelectUser(contact);
                            onClose();
                          }}
                          className="flex items-center p-3 hover:bg-gray-50 active:bg-gray-100 rounded-lg sm:rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100 touch-manipulation"
                        >
                          {contact.image ? (
                            <Image
                              src={contact.image}
                              alt={contact.name || "User"}
                              width={isMobile ? 40 : 44}
                              height={isMobile ? 40 : 44}
                              unoptimized
                              className={`rounded-full object-cover border border-gray-200 ${
                                isMobile ? "w-10 h-10" : "w-11 h-11"
                              }`}
                            />
                          ) : (
                            <div
                              className={`rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200 ${
                                isMobile ? "w-10 h-10 text-base" : "w-11 h-11"
                              }`}
                            >
                              {(contact.name || "?").charAt(0)}
                            </div>
                          )}
                          <div className="ml-3 flex-1 min-w-0">
                            <p
                              className={`font-bold text-gray-900 truncate ${
                                isMobile ? "text-sm" : "text-base"
                              }`}
                            >
                              {contact.name || "Unknown User"}
                            </p>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                              <span
                                className={`rounded-md font-medium truncate ${
                                  contact.role === "PROVIDER"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                } ${
                                  isMobile
                                    ? "text-[10px] px-1.5 py-0.5"
                                    : "text-xs px-2 py-0.5"
                                }`}
                              >
                                {contact.role}
                              </span>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-gray-300 text-lg">
                            arrow_forward
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : searchQuery.length >= 2 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">
                      person_search
                    </span>
                    <p
                      className={`font-medium mb-1 ${
                        isMobile ? "text-sm" : "text-base"
                      }`}
                    >
                      No users found
                    </p>
                    <p
                      className={`text-gray-400 ${
                        isMobile ? "text-xs" : "text-sm"
                      }`}
                    >
                      Try a different search term
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Mobile backdrop to close modal */}
          {isMobile && (
            <div
              className="absolute inset-0 -z-10"
              onClick={onClose}
              aria-hidden="true"
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
