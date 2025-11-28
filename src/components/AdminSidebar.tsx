'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { name: 'Users', href: '/admin/users', icon: 'group' },
  { name: 'Verifications', href: '/admin/verifications', icon: 'verified_user' },
  { name: 'Bookings', href: '/admin/bookings', icon: 'calendar_month' },
  { name: 'Disputes', href: '/admin/disputes', icon: 'gavel' },
  { name: 'Support', href: '/admin/support', icon: 'support_agent' },
  { name: 'Finance', href: '/admin/finance', icon: 'payments' },
  { name: 'Settings', href: '/admin/settings', icon: 'settings' },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const AdminSidebar = ({ isOpen, onClose }: AdminSidebarProps) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white border-r border-slate-800 p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
        role="complementary"
        aria-label="Admin navigation"
      >
      <div className="flex flex-col gap-8">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 px-2 py-2">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg p-1">
              <img src="/images/JustinTimeLogo.png" alt="JustInTime Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xl text-white">Admin</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav aria-label="Primary navigation">
          <ul className="flex flex-col gap-1.5" role="list">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(`${item.href}`));
              
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-emerald-600 text-white font-medium shadow-sm' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span 
                      className={`material-symbols-outlined text-[22px] transition-colors ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Admin Profile */}
      <div 
        className="flex items-center gap-3 border-t border-slate-800 pt-4 mt-auto"
        role="region"
        aria-label="User profile"
      >
        <div 
          className="bg-slate-800 rounded-full w-10 h-10 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-700"
        >
          {session?.user?.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || 'Admin'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-slate-400">person</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-white text-sm font-semibold truncate">
            {session?.user?.name || 'Admin User'}
          </h2>
          <p className="text-slate-500 text-xs truncate">
            {session?.user?.email || 'admin@example.com'}
          </p>
        </div>
        <Link 
          href="/api/auth/signout" 
          className="ml-auto text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
          title="Sign out"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </Link>
      </div>
    </aside>
    </>
  );
};

export default AdminSidebar;
