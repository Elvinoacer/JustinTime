"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface SocialLink {
  platform: string;
  url: string;
}

interface SocialLinksSectionProps {
  socialLinks: SocialLink[];
  isEditing: boolean;
  isMobile: boolean;
  onAdd: (link: SocialLink) => void;
  onRemove: (index: number) => void;
}

const PLATFORM_OPTIONS = [
  { value: 'Website', label: 'Website', icon: 'language' },
  { value: 'LinkedIn', label: 'LinkedIn', icon: 'work' },
  { value: 'Twitter', label: 'Twitter/X', icon: 'tag' },
  { value: 'Facebook', label: 'Facebook', icon: 'thumb_up' },
  { value: 'Instagram', label: 'Instagram', icon: 'photo_camera' },
  { value: 'GitHub', label: 'GitHub', icon: 'code' },
  { value: 'YouTube', label: 'YouTube', icon: 'play_circle' },
  { value: 'TikTok', label: 'TikTok', icon: 'music_note' },
  { value: 'Behance', label: 'Behance', icon: 'palette' },
  { value: 'Dribbble', label: 'Dribbble', icon: 'sports_basketball' },
];

const getSocialIcon = (platform: string) => {
  const option = PLATFORM_OPTIONS.find(opt => opt.value === platform);
  return option?.icon || 'link';
};

export default function SocialLinksSection({
  socialLinks,
  isEditing,
  isMobile,
  onAdd,
  onRemove,
}: SocialLinksSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [newLink, setNewLink] = useState<SocialLink>({ platform: 'Website', url: '' });

  const handleAdd = () => {
    if (newLink.url.trim()) {
      onAdd(newLink);
      setNewLink({ platform: 'Website', url: '' });
      setShowModal(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
          isMobile ? "p-4 sm:p-5" : "p-6 md:p-8"
        }`}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className={`font-bold text-gray-900 flex items-center gap-2 ${
            isMobile ? "text-base sm:text-lg" : "text-lg"
          }`}>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
              link
            </span>
            Social Links & Portfolio
          </h3>
          {isEditing && (
            <button
              onClick={() => setShowModal(true)}
              className={`bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5 ${
                isMobile ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
              }`}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Link</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {socialLinks.map((link, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">
                    {getSocialIcon(link.platform)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-gray-900 ${
                    isMobile ? "text-sm" : "text-base"
                  }`}>
                    {link.platform}
                  </p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-emerald-600 hover:text-emerald-700 truncate block ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    {link.url}
                  </a>
                </div>
              </div>
              {isEditing && (
                <button
                  onClick={() => onRemove(index)}
                  className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors shrink-0"
                  aria-label="Remove link"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              )}
            </div>
          ))}

          {socialLinks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <span className={`material-symbols-outlined text-gray-300 mb-2 block ${
                isMobile ? "text-3xl" : "text-4xl"
              }`}>
                link_off
              </span>
              <p className={isMobile ? "text-sm" : "text-base"}>
                No social links added yet
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Link Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-xl w-full max-w-md ${
              isMobile ? "p-4" : "p-5 sm:p-6"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-gray-900 ${
                isMobile ? "text-base sm:text-lg" : "text-lg"
              }`}>
                Add Social Link
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewLink({ platform: 'Website', url: '' });
                }}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block font-medium text-gray-700 mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Platform
                </label>
                <select
                  value={newLink.platform}
                  onChange={(e) => setNewLink({ ...newLink, platform: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                >
                  {PLATFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block font-medium text-gray-700 mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  URL
                </label>
                <input
                  type="url"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  placeholder="https://example.com"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setNewLink({ platform: 'Website', url: '' });
                  }}
                  className={`flex-1 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors ${
                    isMobile ? "px-4 py-2 text-sm" : "px-6 py-2.5"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newLink.url.trim()}
                  className={`flex-1 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isMobile ? "px-4 py-2 text-sm" : "px-6 py-2.5"
                  }`}
                >
                  Add Link
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
