'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

const navItems = [
  { name: 'Dashboard', href: '/client/dashboard', icon: 'dashboard' },
  { name: 'Analytics', href: '/client/analytics', icon: 'analytics' },
  { name: 'Post a Job', href: '/client/post-job', icon: 'add_circle' },
  { name: 'My Proposals', href: '/client/proposals', icon: 'description' },
  { name: 'Bookings', href: '/client/bookings', icon: 'calendar_month' },
  { name: 'Messages', href: '/client/messages', icon: 'chat' },
  { name: 'Wallet', href: '/client/wallet', icon: 'account_balance_wallet' },
  { name: 'Profile', href: '/client/profile', icon: 'person' },
];

const secondaryItems = [
  { name: 'Notifications', href: '/client/notifications', icon: 'notifications' },
  { name: 'Referral', href: '/client/referral', icon: 'card_giftcard' },
  { name: 'Settings', href: '/client/settings', icon: 'settings' },
];

const ClientSidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside 
      className="hidden lg:flex h-screen flex-col justify-between bg-white border-r border-gray-100 p-4 w-64 sticky top-0"
      role="complementary"
      aria-label="Client navigation"
    >
      <div className="flex flex-col gap-8">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 px-2 py-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/images/JustinTimeLogo.png" alt="JustInTime Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xl text-gray-900">JustInTime</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav aria-label="Primary navigation">
          <ul className="flex flex-col gap-1.5" role="list">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span 
                      className={`material-symbols-outlined text-[22px] transition-colors ${
                        isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          
          {/* Secondary Navigation */}
          <div className="pt-2 mt-2 border-t border-gray-100">
            <ul className="flex flex-col gap-1.5" role="list">
              {secondaryItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                
                return (
                  <li key={item.name}>
                    <Link 
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700 font-medium shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span 
                        className={`material-symbols-outlined text-[22px] transition-colors ${
                          isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
        
        {/* Dashboard Switch - Role-based */}
        <div className="pt-2 mt-2 border-t border-gray-100">
          {session?.user?.role === "PROVIDER" ? (
            <Link 
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <span 
                className="material-symbols-outlined text-[22px] transition-colors text-gray-400 group-hover:text-gray-600"
                aria-hidden="true"
              >
                swap_horiz
              </span>
              <span className="text-sm">Provider Dashboard</span>
            </Link>
          ) : (
            <Link 
              href="/onboarding?upgrade=true"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              <span 
                className="material-symbols-outlined text-[22px] transition-colors text-emerald-600"
                aria-hidden="true"
              >
                work
              </span>
              <span className="text-sm font-medium">Become a Provider</span>
            </Link>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div 
        className="flex items-center gap-3 border-t border-gray-100 pt-4 mt-auto"
        role="region"
        aria-label="User profile"
      >
        <div 
          className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200"
        >
          {session?.user?.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || 'User'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-gray-400">person</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-gray-900 text-sm font-semibold truncate">
            {session?.user?.name || 'Client'}
          </h2>
          <p className="text-gray-500 text-xs truncate">
            {session?.user?.email || 'client@example.com'}
          </p>
        </div>
        <Link 
          href="/api/auth/signout" 
          className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
          title="Sign out"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </Link>
      </div>
    </aside>
  );
};

export default ClientSidebar;
