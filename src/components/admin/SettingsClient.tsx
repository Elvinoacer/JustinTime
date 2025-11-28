'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Settings, Shield, Bell, LayoutGrid } from 'lucide-react';
import EnhancedCategoryManagement from '@/components/admin/EnhancedCategoryManagement';
import EnhancedSystemSettings from '@/components/admin/EnhancedSystemSettings';

import { useFcmToken } from '@/lib/hooks/useFcmToken';

interface SettingsClientProps {
  categories: any[];
  systemSettings: any[];
}

export default function SettingsClient({ categories, systemSettings }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('categories');
  const { token, notificationPermission } = useFcmToken();

  const tabs = [
    { id: 'categories', label: 'Categories', icon: Layers, description: 'Manage service categories and structure' },
    { id: 'system', label: 'System', icon: Settings, description: 'Configure platform-wide settings' },
    // { id: 'security', label: 'Security', icon: Shield, description: 'Security policies and access control' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and push notification templates' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      <div className="max-w-[1600px] mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Platform Settings</h1>
          <p className="text-slate-600">Manage your application configuration and preferences</p>
        </div>

        {/* Tabs Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-300 ${
                  isActive
                    ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 hover:border-emerald-200 hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className={`font-bold mb-1 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {tab.label}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'categories' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Layers className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Category Management</h2>
                      <p className="text-sm text-slate-500">Organize your services into logical categories</p>
                    </div>
                  </div>
                  <EnhancedCategoryManagement categories={categories} />
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Settings className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">System Configuration</h2>
                      <p className="text-sm text-slate-500">Global settings affecting platform behavior</p>
                    </div>
                  </div>
                  <EnhancedSystemSettings settings={systemSettings} />
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Bell className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Notification Settings</h2>
                      <p className="text-sm text-slate-500">Manage push notifications and alerts</p>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Push Notifications</h3>
                    <PushNotificationToggle />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PushNotificationToggle() {
  const { token, requestPermission, notificationPermission } = useFcmToken();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!token && notificationPermission !== 'denied') {
      setIsLoading(true);
      await requestPermission();
      setIsLoading(false);
    }
  };

  const isEnabled = !!token;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex-1">
        <h3 className="font-medium text-slate-900 flex items-center gap-2">
          Enable Notifications
          {isEnabled && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
              Active
            </span>
          )}
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          {isEnabled 
            ? "You are receiving real-time updates on this device." 
            : notificationPermission === 'denied' 
              ? "Notifications are blocked in your browser settings." 
              : "Enable to receive real-time updates."}
        </p>
      </div>
      <label className={`relative inline-flex items-center cursor-pointer ${isLoading ? 'opacity-50' : ''}`}>
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isEnabled}
          onChange={handleToggle}
          disabled={isEnabled || notificationPermission === 'denied' || isLoading} 
        />
        <div className={`w-14 h-7 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600 ${(isEnabled || notificationPermission === 'denied') ? 'cursor-default' : ''}`}></div>
      </label>
    </div>
  );
}
