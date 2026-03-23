'use client';

import { updateSystemSetting } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface SystemSetting {
  key: string;
  value: any;
  description: string | null;
}

interface SystemSettingsProps {
  settings: SystemSetting[];
}

export default function SystemSettings({ settings }: SystemSettingsProps) {
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
      icon: '💰',
      category: 'Finance',
      unit: '%'
    },
    { 
      key: 'maintenance_mode', 
      defaultValue: false, 
      description: 'Enable maintenance mode to temporarily disable the platform', 
      type: 'boolean',
      icon: '🔧',
      category: 'System'
    },
    { 
      key: 'min_withdrawal_amount', 
      defaultValue: 100, 
      description: 'Minimum amount required for wallet withdrawals', 
      type: 'number',
      icon: '💵',
      category: 'Finance',
      unit: 'KES'
    },
    { 
      key: 'support_email', 
      defaultValue: 'support@gtss.software', 
      description: 'Primary support email address for customer inquiries', 
      type: 'text',
      icon: '📧',
      category: 'Contact'
    },
    { 
      key: 'max_file_upload_mb', 
      defaultValue: 10, 
      description: 'Maximum file size allowed for uploads', 
      type: 'number',
      icon: '📁',
      category: 'System',
      unit: 'MB'
    },
    { 
      key: 'booking_cancellation_window_hours', 
      defaultValue: 24, 
      description: 'Time window before booking when cancellation is allowed', 
      type: 'number',
      icon: '⏰',
      category: 'Bookings',
      unit: 'hours'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">System Configuration</h3>
          <p className="text-sm text-slate-500 mt-1">Manage platform-wide settings and parameters</p>
        </div>
      </div>

      {categories.map(category => (
        <div key={category} className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{category}</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {defaultSettings.filter(s => s.category === category).map((defaultSetting) => {
              const isEditing = editingKey === defaultSetting.key;
              const currentValue = getSettingValue(defaultSetting.key);

              return (
                <div 
                  key={defaultSetting.key} 
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">{defaultSetting.icon}</div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-slate-900 text-sm">
                          {defaultSetting.key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </h5>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {defaultSetting.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                      {defaultSetting.type === 'boolean' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setFormData({ ...formData, value: 'true' })}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              formData.value === 'true'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-base">check_circle</span>
                              Enabled
                            </span>
                          </button>
                          <button
                            onClick={() => setFormData({ ...formData, value: 'false' })}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              formData.value === 'false'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-base">cancel</span>
                              Disabled
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type={defaultSetting.type === 'number' ? 'number' : 'text'}
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            className="w-full p-2.5 pr-12 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder={`Enter ${defaultSetting.key.replace(/_/g, ' ')}`}
                          />
                          {defaultSetting.unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                              {defaultSetting.unit}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isPending}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {isPending ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Saving...
                            </span>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                          defaultSetting.type === 'boolean'
                            ? currentValue 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {defaultSetting.type === 'boolean' 
                            ? (currentValue ? '✓ Enabled' : '✗ Disabled')
                            : `${currentValue} ${defaultSetting.unit || ''}`
                          }
                        </span>
                      </div>
                      <button
                        onClick={() => handleEdit(defaultSetting.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
