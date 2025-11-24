'use client';

import { motion } from 'framer-motion';
import { activeJobs } from '@/lib/dummyData/dashboard';

const ActiveJobs = () => {

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
      <h3 className="text-gray-800 text-xl font-bold mb-4">Active Jobs</h3>
      <div className="space-y-4">
        {activeJobs.map((job) => (
            <div key={job.title} className="flex items-center justify-between gap-4 rounded-md p-4 bg-white border border-gray-200">
                <div className="flex-1">
                    <p className="text-gray-800 text-base font-bold">{job.title}</p>
                    <p className="text-gray-500 text-sm">Client: {job.client} | Date: {job.date} | Time: {job.time}</p>
                    <button className="mt-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-md text-xs font-medium hover:bg-primary-200">View Details</button>
                </div>
                <div 
                    className="w-32 h-20 bg-center bg-no-repeat bg-cover rounded-md"
                    style={{backgroundImage: `url('${job.imageUrl}')`}}
                ></div>
            </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ActiveJobs;
