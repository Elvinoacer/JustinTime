'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'dashboard', description: 'Overview' },
  { name: 'Services', href: '/dashboard/services', icon: 'construction', description: 'Manage services' },
  { name: 'Bookings', href: '/dashboard/bookings', icon: 'calendar_month', description: 'View bookings' },
  { name: 'Earnings', href: '/dashboard/earnings', icon: 'payments', description: 'Track income' },
  { name: 'Profile', href: '/dashboard/profile', icon: 'person', description: 'Edit profile' },
  { name: 'Reviews', href: '/dashboard/reviews', icon: 'grade', description: 'Customer feedback' },
];

const Sidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <aside 
      className="flex h-screen flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700 shadow-2xl w-72 sticky top-0 overflow-hidden"
      role="complementary"
      aria-label="Main navigation"
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-700/50">
        <Link 
          href="/" 
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-2 -m-2"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/50 transition-shadow">
            <span className="material-symbols-outlined text-white font-bold">schedule</span>
          </div>
          <div>
            <span className="font-bold text-xl text-white tracking-tight">JustInTime</span>
            <p className="text-xs text-gray-400">Provider Portal</p>
          </div>
        </Link>
      </div>

      {/* Scrollable Navigation */}
      <nav 
        aria-label="Primary navigation" 
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#374151 transparent'
        }}
      >
        <ul className="flex flex-col gap-1" role="list">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link 
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={`${item.name} - ${item.description}`}
                  className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isActive 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30' 
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <motion.div
                    className="flex items-center gap-3 w-full"
                    whileHover={{ x: isActive ? 0 : 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <span 
                      className={`material-symbols-outlined text-xl ${
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-emerald-400'
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold block">{item.name}</span>
                      {!isActive && (
                        <span className="text-xs text-gray-500 group-hover:text-gray-400 block truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="w-1.5 h-1.5 bg-white rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-4 border-t border-gray-700/50" />

        {/* Secondary Actions */}
        <ul className="flex flex-col gap-1" role="list">
          <li>
            <Link 
              href="/dashboard/settings"
              className="group flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400" aria-hidden="true">
                settings
              </span>
              <span className="text-sm font-semibold">Settings</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/dashboard/help"
              className="group flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Help & Support"
            >
              <span className="material-symbols-outlined text-xl text-gray-400 group-hover:text-emerald-400" aria-hidden="true">
                help
              </span>
              <span className="text-sm font-semibold">Help</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Fixed Footer - User Profile */}
      <div className="flex-shrink-0 border-t border-gray-700/50 p-4 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="relative bg-center bg-no-repeat bg-cover rounded-full size-11 ring-2 ring-emerald-500/30 flex-shrink-0 overflow-hidden"
            style={session?.user?.image ? {backgroundImage: `url("${session.user.image}")`} : {}}
            role="img"
            aria-label={`${session?.user?.name || 'User'} profile picture`}
          >
            {!session?.user?.image && (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">person</span>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-gray-900 rounded-full" 
                 title="Online" 
                 aria-label="Online status"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-sm font-semibold leading-tight truncate">
              {session?.user?.name || 'Loading...'}
            </h2>
            <p className="text-gray-400 text-xs font-medium capitalize truncate">
              {session?.user?.role?.toLowerCase() || 'User'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 group"
          aria-label="Sign out"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          <span className="text-sm font-semibold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;