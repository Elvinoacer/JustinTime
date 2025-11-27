'use client';

import { updateSystemSetting } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  DollarSign, 
  Wrench, 
  CreditCard, 
  Mail, 
  FileText, 
  Clock, 
  Check, 
  X, 
  Edit2,
  Save,
  AlertCircle
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: any;
  description: string | null;
}

interface EnhancedSystemSettingsProps {
  settings: SystemSetting[];
}

export default function EnhancedSystemSettings({ settings }: EnhancedSystemSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: ''
  });

  // Default settings structure with icons and categories
  const defaultSettings = [
    { 
      key: 'platform_fee_percentage', 
      defaultValue: 10, 
      description: 'Platform fee percentage applied to all transactions', 
      type: 'number',
      icon: DollarSign,
      category: 'Finance',
      unit: '%',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    { 
      key: 'maintenance_mode', 
      defaultValue: false, 
      description: 'Enable maintenance mode to temporarily disable the platform', 
      type: 'boolean',
      icon: Wrench,
      category: 'System',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    { 
      key: 'min_withdrawal_amount', 
      defaultValue: 100, 
      description: 'Minimum amount required for wallet withdrawals', 
      type: 'number',
      icon: CreditCard,
      category: 'Finance',
      unit: 'KES',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      key: 'support_email', 
      defaultValue: 'support@justintime.com', 
      description: 'Primary support email address for customer inquiries', 
      type: 'text',
      icon: Mail,
      category: 'Contact',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      key: 'max_file_upload_mb', 
      defaultValue: 10, 
      description: 'Maximum file size allowed for uploads', 
      type: 'number',
      icon: FileText,
      category: 'System',
      unit: 'MB',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100'
    },
    { 
      key: 'booking_cancellation_window_hours', 
      defaultValue: 24, 
      description: 'Time window before booking when cancellation is allowed', 
      type: 'number',
      icon: Clock,
      category: 'Bookings',
      unit: 'hours',
      color: 'text-rose-600',
      bgColor: 'bg-rose-100'
    },
  ];

  const getSettingValue = (key: string) => {
    const setting = settings.find(s => s.key === key);
    if (setting) {
      if (typeof setting.value === 'object') {
        return JSON.stringify(setting.value);
      }
      return setting.value;
    }
    return defaultSettings.find(d => d.key === key)?.defaultValue || '';
  };

  const handleEdit = (key: string) => {
    const setting = settings.find(s => s.key === key);
    const defaultSetting = defaultSettings.find(d => d.key === key);
    
    setEditingKey(key);
    setFormData({
      key,
      value: setting ? String(setting.value) : String(defaultSetting?.defaultValue || ''),
      description: setting?.description || defaultSetting?.description || ''
    });
  };

  const handleSave = async () => {
    if (!editingKey) return;

    const defaultSetting = defaultSettings.find(d => d.key === editingKey);
    let processedValue: any = formData.value;

    if (defaultSetting?.type === 'number') {
      processedValue = Number(formData.value);
    } else if (defaultSetting?.type === 'boolean') {
      processedValue = formData.value === 'true';
    }

    startTransition(async () => {
      const result = await updateSystemSetting(editingKey, processedValue, formData.description);
      if (result.success) {
        setEditingKey(null);
        router.refresh();
      } else {
        alert(result.error || 'Failed to update setting');
      }
    });
  };

  // Group settings by category
  const categories = Array.from(new Set(defaultSettings.map(s => s.category)));

  return (
    <div className="space-y-8">
      {categories.map((category, categoryIndex) => (
        <motion.div 
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: categoryIndex * 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 px-1">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{category}</h4>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {defaultSettings.filter(s => s.category === category).map((defaultSetting, index) => {
              const isEditing = editingKey === defaultSetting.key;
              const currentValue = getSettingValue(defaultSetting.key);
              const Icon = defaultSetting.icon;

              return (
                <motion.div 
                  key={defaultSetting.key}
                  layout
                  className={`relative bg-white rounded-2xl border transition-all duration-300 ${
                    isEditing 
                      ? 'border-emerald-500 shadow-lg ring-4 ring-emerald-500/10 z-10' 
                      : 'border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${defaultSetting.bgColor} ${defaultSetting.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-900 text-base mb-1">
                          {defaultSetting.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </h5>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {defaultSetting.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                      {isEditing ? (
                        <div className="space-y-4">
                          {defaultSetting.type === 'boolean' ? (
                            <div className="flex gap-3">
                              <button
                                onClick={() => setFormData({ ...formData, value: 'true' })}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                  formData.value === 'true'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                Enabled
                              </button>
                              <button
                                onClick={() => setFormData({ ...formData, value: 'false' })}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                  formData.value === 'false'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <X className="w-4 h-4" />
                                Disabled
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type={defaultSetting.type === 'number' ? 'number' : 'text'}
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-900"
                                placeholder={`Enter value...`}
                              />
                              {defaultSetting.unit && (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                  {defaultSetting.unit}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex gap-3">
                            <button
                              onClick={() => setEditingKey(null)}
                              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={isPending}
                              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                            >
                              {isPending ? 'Saving...' : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Save Changes
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                              defaultSetting.type === 'boolean'
                                ? currentValue 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-red-50 text-red-700 border border-red-100'
                                : 'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {defaultSetting.type === 'boolean' 
                                ? (currentValue ? '✓ Enabled' : '✗ Disabled')
                                : `${currentValue} ${defaultSetting.unit || ''}`
                              }
                            </span>
                          </div>
                          <button
                            onClick={() => handleEdit(defaultSetting.key)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
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
      ))}
    </div>
  );
}
