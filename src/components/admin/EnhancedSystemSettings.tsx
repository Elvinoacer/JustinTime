"use client";

import { updateSystemSetting } from "@/app/actions/admin";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  CreditCard,
  DollarSign,
  Edit2,
  FileText,
  Mail,
  Save,
  Wrench,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface SystemSetting {
  key: string;
  value: any;
  description: string | null;
}

interface EnhancedSystemSettingsProps {
  settings: SystemSetting[];
}

export default function EnhancedSystemSettings({
  settings,
}: EnhancedSystemSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    description: "",
  });

  // Default settings structure with icons and categories
  const defaultSettings = [
    {
      key: "platform_fee_percentage",
      defaultValue: 10,
      description: "Platform fee percentage applied to all transactions",
      type: "number",
      icon: DollarSign,
      category: "Finance",
      unit: "%",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      key: "maintenance_mode",
      defaultValue: false,
      description:
        "Enable maintenance mode to temporarily disable the platform",
      type: "boolean",
      icon: Wrench,
      category: "System",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      key: "min_withdrawal_amount",
      defaultValue: 100,
      description: "Minimum amount required for wallet withdrawals",
      type: "number",
      icon: CreditCard,
      category: "Finance",
      unit: "KES",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      key: "support_email",
      defaultValue: "support@gtss.software",
      description: "Primary support email address for customer inquiries",
      type: "text",
      icon: Mail,
      category: "Contact",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      key: "max_file_upload_mb",
      defaultValue: 10,
      description: "Maximum file size allowed for uploads",
      type: "number",
      icon: FileText,
      category: "System",
      unit: "MB",
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    },
    {
      key: "booking_cancellation_window_hours",
      defaultValue: 24,
      description: "Time window before booking when cancellation is allowed",
      type: "number",
      icon: Clock,
      category: "Bookings",
      unit: "hours",
      color: "text-rose-600",
      bgColor: "bg-rose-100",
    },
  ];

  const getSettingValue = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    if (setting) {
      if (typeof setting.value === "object") {
        return JSON.stringify(setting.value);
      }
      return setting.value;
    }
    return defaultSettings.find((d) => d.key === key)?.defaultValue || "";
  };

  const handleEdit = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    const defaultSetting = defaultSettings.find((d) => d.key === key);

    setEditingKey(key);
    setFormData({
      key,
      value: setting
        ? String(setting.value)
        : String(defaultSetting?.defaultValue || ""),
      description: setting?.description || defaultSetting?.description || "",
    });
  };

  const handleSave = async () => {
    if (!editingKey) return;

    const defaultSetting = defaultSettings.find((d) => d.key === editingKey);
    let processedValue: any = formData.value;

    if (defaultSetting?.type === "number") {
      processedValue = Number(formData.value);
    } else if (defaultSetting?.type === "boolean") {
      processedValue = formData.value === "true";
    }

    startTransition(async () => {
      const result = await updateSystemSetting(
        editingKey,
        processedValue,
        formData.description
      );
      if (result.success) {
        setEditingKey(null);
        router.refresh();
      } else {
        alert(result.error || "Failed to update setting");
      }
    });
  };

  // Group settings by category
  const categories = Array.from(
    new Set(defaultSettings.map((s) => s.category))
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {categories.map((category, categoryIndex) => {
        const categorySettings = defaultSettings.filter(
          (s) => s.category === category
        );
        const isExpanded = expandedCategories.has(category);

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Category Header - Mobile Collapsible */}
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full p-3 sm:p-0 sm:px-1 bg-white sm:bg-transparent rounded-lg sm:rounded-none border border-slate-200 sm:border-none"
            >
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  {category}
                </h4>
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                  {categorySettings.length}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:hidden">
                <div className="h-px bg-slate-200 w-4" />
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="hidden sm:block h-px bg-slate-200 flex-1 ml-4" />
            </button>

            {/* Settings Grid - Hidden on mobile when collapsed */}
            <div
              className={`${
                !isExpanded ? "hidden sm:grid" : "grid"
              } grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-6`}
            >
              {categorySettings.map((defaultSetting, index) => {
                const isEditing = editingKey === defaultSetting.key;
                const currentValue = getSettingValue(defaultSetting.key);
                const Icon = defaultSetting.icon;

                return (
                  <motion.div
                    key={defaultSetting.key}
                    layout
                    className={`relative bg-white rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                      isEditing
                        ? "border-emerald-500 shadow-lg ring-4 ring-emerald-500/10 z-10"
                        : "border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200"
                    }`}
                  >
                    <div className="p-4 xs:p-5 sm:p-6">
                      <div className="flex items-start gap-3 xs:gap-4">
                        <div
                          className={`p-2 xs:p-3 rounded-lg xs:rounded-xl ${defaultSetting.bgColor} ${defaultSetting.color} flex-shrink-0`}
                        >
                          <Icon className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-900 text-sm xs:text-base mb-1 leading-tight">
                            {defaultSetting.key
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </h5>
                          <p className="text-xs xs:text-sm text-slate-500 leading-relaxed">
                            {defaultSetting.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 xs:mt-6 pt-4 xs:pt-6 border-t border-slate-100">
                        {isEditing ? (
                          <div className="space-y-3 xs:space-y-4">
                            {defaultSetting.type === "boolean" ? (
                              <div className="flex gap-2 xs:gap-3">
                                <button
                                  onClick={() =>
                                    setFormData({ ...formData, value: "true" })
                                  }
                                  className={`flex-1 py-2 xs:py-3 px-3 xs:px-4 rounded-lg xs:rounded-xl text-xs xs:text-sm font-bold transition-all flex items-center justify-center gap-1 xs:gap-2 ${
                                    formData.value === "true"
                                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <Check className="w-3 h-3 xs:w-4 xs:h-4" />
                                  Enabled
                                </button>
                                <button
                                  onClick={() =>
                                    setFormData({ ...formData, value: "false" })
                                  }
                                  className={`flex-1 py-2 xs:py-3 px-3 xs:px-4 rounded-lg xs:rounded-xl text-xs xs:text-sm font-bold transition-all flex items-center justify-center gap-1 xs:gap-2 ${
                                    formData.value === "false"
                                      ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <X className="w-3 h-3 xs:w-4 xs:h-4" />
                                  Disabled
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type={
                                    defaultSetting.type === "number"
                                      ? "number"
                                      : "text"
                                  }
                                  value={formData.value}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      value: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 xs:px-4 py-2 xs:py-3 bg-slate-50 border border-slate-200 rounded-lg xs:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-900"
                                  placeholder={`Enter value...`}
                                />
                                {defaultSetting.unit && (
                                  <span className="absolute right-3 xs:right-4 top-1/2 -translate-y-1/2 text-xs xs:text-sm font-bold text-slate-400">
                                    {defaultSetting.unit}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
                              <button
                                onClick={() => setEditingKey(null)}
                                className="flex-1 px-3 xs:px-4 py-2 xs:py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg xs:rounded-xl text-xs xs:text-sm font-bold hover:bg-slate-50 transition-colors order-2 xs:order-1"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSave}
                                disabled={isPending}
                                className="flex-1 px-3 xs:px-4 py-2 xs:py-2.5 bg-emerald-600 text-white rounded-lg xs:rounded-xl text-xs xs:text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1 xs:gap-2 order-1 xs:order-2"
                              >
                                {isPending ? (
                                  "Saving..."
                                ) : (
                                  <>
                                    <Save className="w-3 h-3 xs:w-4 xs:h-4" />
                                    Save
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 xs:px-3 py-1 xs:py-1.5 rounded-lg text-xs xs:text-sm font-bold ${
                                  defaultSetting.type === "boolean"
                                    ? currentValue
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : "bg-red-50 text-red-700 border border-red-100"
                                    : "bg-slate-50 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {defaultSetting.type === "boolean"
                                  ? currentValue
                                    ? "✓ Enabled"
                                    : "✗ Disabled"
                                  : `${currentValue} ${
                                      defaultSetting.unit || ""
                                    }`}
                              </span>
                            </div>
                            <button
                              onClick={() => handleEdit(defaultSetting.key)}
                              className="p-1.5 xs:p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
