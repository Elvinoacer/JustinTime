"use client";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/actions/admin";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  Check,
  Edit2,
  Image as ImageIcon,
  Layers,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count: {
    services: number;
    jobs: number;
  };
}

interface EnhancedCategoryManagementProps {
  categories: Category[];
}

export default function EnhancedCategoryManagement({
  categories,
}: EnhancedCategoryManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
  });

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "", image: "" });
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
    });
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleSubmit = async () => {
    startTransition(async () => {
      const result = editingCategory
        ? await updateCategory(editingCategory.id, formData)
        : await createCategory(formData);

      if (result.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert(result.error || "Failed to save category");
      }
    });
  };

  const handleDelete = async (categoryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this category? This action cannot be undone."
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Failed to delete category");
      }
    });
  };

  const handleSlugify = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData({ ...formData, slug });
  };

  // Mobile Card View Component
  const MobileCategoryCard = ({
    category,
    index,
  }: {
    category: Category;
    index: number;
  }) => {
    return (
      <motion.div
        key={category.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.05 }}
        className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
      >
        <div className="relative h-32 bg-slate-100 overflow-hidden">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50/50">
              <ImageIcon className="w-8 h-8 text-slate-300" />
            </div>
          )}

          {/* Mobile Action Menu */}
          <div className="absolute top-3 right-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === category.id ? null : category.id);
              }}
              className="p-1.5 bg-white/80 backdrop-blur-md rounded-lg text-slate-600 hover:bg-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {activeMenu === category.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]"
                >
                  <button
                    onClick={() => handleOpenEdit(category)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    disabled={
                      category._count.services > 0 || category._count.jobs > 0
                    }
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-3">
          <div className="mb-2">
            <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors truncate">
              {category.name}
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
              {category.slug}
            </p>
          </div>

          {category.description && (
            <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
              {category.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Layers className="w-3 h-3 text-emerald-500" />
              {category._count.services}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Briefcase className="w-3 h-3 text-teal-500" />
              {category._count.jobs}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col xs:flex-row gap-3 justify-between items-stretch xs:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 xs:py-3 bg-white border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-sm"
          />
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 xs:px-6 py-2.5 xs:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg xs:rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
        >
          <Plus className="w-4 h-4 xs:w-5 xs:h-5" />
          <span className="hidden xs:inline">Add Category</span>
          <span className="xs:hidden">Add</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-6">
        <AnimatePresence>
          {filteredCategories.map((category, index) => (
            <MobileCategoryCard
              key={category.id}
              category={category}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl sm:rounded-2xl border border-slate-200 border-dashed">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-50 rounded-full mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-slate-900">
            No categories found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Try adjusting your search or add a new category
          </p>
        </div>
      )}

      {/* Modal - Mobile Responsive */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 xs:p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm xs:max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {editingCategory ? "Edit Category" : "Create Category"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    onBlur={handleSlugify}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    placeholder="e.g., Home Cleaning"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-mono text-slate-600"
                    placeholder="e.g., home-cleaning"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm min-h-[80px] sm:min-h-[100px] resize-none"
                    placeholder="Describe this category..."
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">
                    Image URL
                  </label>
                  <div className="flex gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) =>
                        setFormData({ ...formData, image: e.target.value })
                      }
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                      placeholder="https://..."
                    />
                    {formData.image && (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                        <img
                          src={formData.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col xs:flex-row gap-2 xs:gap-3 justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 sm:px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg sm:rounded-xl text-sm font-medium transition-colors order-2 xs:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !formData.name || !formData.slug}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg sm:rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed order-1 xs:order-2"
                >
                  {isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingCategory ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 z-40 lg:hidden"
            onClick={() => setActiveMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
