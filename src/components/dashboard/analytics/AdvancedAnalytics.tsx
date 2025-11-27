'use client';

import { motion } from 'framer-motion';

interface AdvancedAnalyticsProps {
  bookings: any[];
  earnings: any[];
  reviews: any[];
}

const AdvancedAnalytics = ({ bookings, earnings, reviews }: AdvancedAnalyticsProps) => {
  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500">workspace_premium</span>
          Pro Insights
        </h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
          Premium
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Retention */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Customer Retention</h3>
          <p className="text-gray-500 text-sm mb-6">Returning customers vs new customers</p>
          
          <div className="flex items-center justify-center h-48 relative">
            <div className="w-32 h-32 rounded-full border-8 border-gray-100 border-t-emerald-500 border-r-emerald-500 transform -rotate-45" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">75%</span>
              <span className="text-xs text-gray-500">Retention</span>
            </div>
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">Returning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <span className="text-sm text-gray-600">New</span>
            </div>
          </div>
        </motion.div>

        {/* Revenue Growth */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-2">Revenue Growth</h3>
          <p className="text-gray-500 text-sm mb-6">Monthly revenue comparison</p>
          
          <div className="h-48 flex items-end gap-3">
            {[35, 45, 40, 60, 75, 90].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end gap-2 group">
                <div 
                  className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-lg transition-all duration-500 group-hover:opacity-90"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400 font-medium">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </motion.div>
      </div>

      {/* Service Popularity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-6">Service Performance</h3>
        <div className="space-y-4">
          {[
            { name: 'House Cleaning', value: 85, color: 'bg-blue-500' },
            { name: 'Plumbing Repair', value: 65, color: 'bg-purple-500' },
            { name: 'Electrical Work', value: 45, color: 'bg-pink-500' },
          ].map((service) => (
            <div key={service.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{service.name}</span>
                <span className="text-gray-500">{service.value}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${service.color}`} 
                  style={{ width: `${service.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedAnalytics;
