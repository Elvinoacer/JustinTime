'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id?: string;
  name: string;
  slug?: string;
  icon?: string;
  count?: number;
}

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

export default function CategoryDropdown({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter categories based on search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (categoryName: string) => {
    onSelectCategory(categoryName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedCat = categories.find(cat => cat.name === selectedCategory);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border-2 border-gray-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600">
            {selectedCat?.icon || 'category'}
          </span>
          <span className="font-medium text-gray-700 truncate">
            {selectedCategory}
          </span>
        </div>
        <span className={`material-symbols-outlined text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 max-h-[400px] flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  search
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
                    search_off
                  </span>
                  <p className="text-sm text-gray-500">No categories found</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredCategories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => handleSelect(category.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                        selectedCategory === category.name
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg ${
                          selectedCategory === category.name
                            ? 'text-white'
                            : 'text-emerald-600'
                        }`}
                      >
                        {category.icon || 'category'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{category.name}</p>
                        {category.count !== undefined && (
                          <p
                            className={`text-xs ${
                              selectedCategory === category.name
                                ? 'text-white/80'
                                : 'text-gray-500'
                            }`}
                          >
                            {category.count} {category.count === 1 ? 'service' : 'services'}
                          </p>
                        )}
                      </div>
                      {selectedCategory === category.name && (
                        <span className="material-symbols-outlined text-white">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Showing {filteredCategories.length} of {categories.length} categories
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
