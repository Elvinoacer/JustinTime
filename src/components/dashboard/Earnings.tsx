'use client';

import { motion } from 'framer-motion';
import { earnings } from '@/lib/dummyData/dashboard';

const Earnings = () => {
  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
    >
      <h3 className="text-gray-800 text-xl font-bold mb-4">Earnings</h3>
      <div className="rounded-md p-6 border border-gray-200 bg-white">
        <p className="text-gray-500 text-base font-medium">Total Earnings</p>
        <p className="text-gray-800 text-3xl font-bold">{earnings.total}</p>
      </div>
    </motion.div>
  );
};

export default Earnings;
