'use client';

import { motion } from 'framer-motion';
import { recentMessages } from '@/lib/dummyData/dashboard';

const RecentMessages = () => {

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
    >
      <h3 className="text-gray-800 text-xl font-bold mb-4">Recent Messages</h3>
      <div className="space-y-4">
        {recentMessages.map((message) => (
            <a key={message.name} className="flex items-center gap-4 p-3 rounded-md bg-white border border-gray-200 hover:bg-gray-100" href="#">
                <div 
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-12"
                    style={{backgroundImage: `url('${message.imageUrl}')`}}
                ></div>
                <div className="flex-1">
                    <p className="text-gray-800 font-medium">{message.name}</p>
                    <p className="text-gray-500 text-sm line-clamp-1">{message.message}</p>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </a>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentMessages;
