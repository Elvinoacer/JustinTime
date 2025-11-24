'use client';

import { motion } from 'framer-motion';
import { serviceDetails } from '@/lib/dummyData/dashboard';

const ServiceDetails = () => {
  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
    >
      <h3 className="text-gray-800 text-xl font-bold mb-4">Service Details</h3>
      <div className="space-y-4 bg-white p-6 rounded-md border border-gray-200">
        <div className="flex justify-between items-center">
          <p className="text-gray-500 font-medium">Service Type</p>
          <p className="text-gray-800 font-semibold">{serviceDetails.type}</p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-gray-500 font-medium">Price/hr</p>
          <p className="text-gray-800 font-semibold">{serviceDetails.price}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium mb-1">Description</p>
          <p className="text-gray-800 text-sm">{serviceDetails.description}</p>
        </div>
        <button 
          className="appearance-none w-full py-2 rounded-md text-white transition-colors"
          style={{ background: 'linear-gradient(to right, #22c55e, #16a34a)' }}
          onClick={() => console.log('Edit Services clicked')}
        >
          Edit Services
        </button>
      </div>
    </motion.div>
  );
};

export default ServiceDetails;
