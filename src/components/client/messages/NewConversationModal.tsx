import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/api/client';

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
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchContacts = async () => {
      if (searchQuery.length < 2) {
        setContacts([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data } = await apiClient.get<{ contacts: Contact[] }>(`/messages/contacts?search=${encodeURIComponent(searchQuery)}`);
        setContacts(data.contacts);
      } catch (error) {
        console.error('Failed to search contacts:', error);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">New Conversation</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-4">
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400">search</span>
              </span>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                autoFocus
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : contacts.length > 0 ? (
                <ul className="space-y-2">
                  {contacts.map((contact) => (
                    <li
                      key={contact.id}
                      onClick={() => {
                        onSelectUser(contact);
                        onClose();
                      }}
                      className="flex items-center p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                    >
                      {contact.image ? (
                        <img
                          src={contact.image}
                          alt={contact.name || 'User'}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200">
                          {(contact.name || '?').charAt(0)}
                        </div>
                      )}
                      <div className="ml-3 flex-1">
                        <p className="font-bold text-gray-900">{contact.name || 'Unknown User'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={`px-1.5 py-0.5 rounded-md font-medium ${
                            contact.role === 'PROVIDER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {contact.role}
                          </span>
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">phone</span>
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No users found</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p>Type at least 2 characters to search</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
