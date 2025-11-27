'use client';

import { motion } from 'framer-motion';

interface BasicAnalyticsProps {
  bookings: any[];
  earnings: any[];
  reviews: any[];
}

const BasicAnalytics = ({ bookings, earnings, reviews }: BasicAnalyticsProps) => {
  // Calculate basic metrics
  const totalBookings = bookings.length;
  const totalEarnings = earnings.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length 
    : 0;

  const stats = [
    {
      name: 'Total Bookings',
      value: totalBookings,
      icon: 'calendar_month',
      color: 'bg-blue-500',
      change: '+12%', // Mock data for change
      changeType: 'increase'
    },
    {
      name: 'Total Earnings',
      value: `$${totalEarnings.toFixed(2)}`,
      icon: 'payments',
      color: 'bg-emerald-500',
      change: '+8%',
      changeType: 'increase'
    },
    {
      name: 'Average Rating',
      value: averageRating.toFixed(1),
      icon: 'star',
      color: 'bg-yellow-500',
      change: '+2%',
      changeType: 'increase'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                <span className={`material-symbols-outlined ${stat.color.replace('bg-', 'text-')}`}>
                  {stat.icon}
                </span>
              </div>
              <span className={`text-sm font-medium ${
                stat.changeType === 'increase' ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.name}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Simple Chart Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-6">Bookings Overview</h3>
        <div className="h-64 flex items-end justify-between gap-2 px-4">
          {[40, 65, 45, 80, 55, 70, 90].map((height, i) => (
            <div key={i} className="w-full bg-gray-100 rounded-t-lg relative group">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg transition-all duration-500 group-hover:bg-emerald-600"
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-xs text-gray-400 font-medium">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </motion.div>
    </div>
  );
};

export default BasicAnalytics;
