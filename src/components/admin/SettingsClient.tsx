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
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Push Notification Status</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Permission Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          notificationPermission === 'granted' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : notificationPermission === 'denied'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {notificationPermission.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">FCM Token:</span>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${token ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-sm text-slate-500">
                            {token ? 'Active & Registered' : 'Not Registered'}
                          </span>
                        </div>
                      </div>

                      {token && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-500 break-all">
                          {token}
                        </div>
                      )}
                    </div>
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
