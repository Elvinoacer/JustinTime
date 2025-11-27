'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id?: string;
  name: string;
  slug?: string;
  icon?: string;
  count?: number;
}

interface AllCategoriesModalProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AllCategoriesModal({
  categories,
  selectedCategory,
  onSelectCategory,
  isOpen,
  onClose,
}: AllCategoriesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter categories based on search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group categories alphabetically
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const firstLetter = cat.name[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  const handleSelect = (categoryName: string) => {
    onSelectCategory(categoryName);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">All Categories</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/60 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                />
              </div>

              <p className="text-emerald-100 text-sm mt-3">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} available
              </p>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto p-6">
              {Object.keys(groupedCategories).length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">search_off</span>
                  <p className="text-gray-500">No categories found</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(groupedCategories)
                    .sort()
                    .map((letter) => (
                      <div key={letter}>
                        <div className="sticky top-0 bg-white py-2 mb-3 border-b border-gray-200">
                          <h3 className="text-lg font-bold text-emerald-600">{letter}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {groupedCategories[letter].map((category) => (
                            <motion.button
                              key={category.name}
                              onClick={() => handleSelect(category.name)}
                              className={`flex items-center justify-between p-4 rounded-xl transition-all text-left ${
                                selectedCategory === category.name
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                              }`}
                              whileHover={{ scale: 1.02, x: 4 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span
                                  className={`material-symbols-outlined ${
                                    selectedCategory === category.name
                                      ? 'text-white'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  {category.icon || 'category'}
                                </span>
                                <div className="flex-1">
                                  <p className="font-semibold">{category.name}</p>
                                  {category.count !== undefined && (
                                    <p
                                      className={`text-xs mt-0.5 ${
                                        selectedCategory === category.name
                                          ? 'text-white/80'
                                          : 'text-gray-500'
                                      }`}
                                    >
                                      {category.count} {category.count === 1 ? 'service' : 'services'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {selectedCategory === category.name && (
                                <span className="material-symbols-outlined text-white">
                                  check_circle
                                </span>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
