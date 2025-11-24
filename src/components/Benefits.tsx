'use client';
import { motion } from 'framer-motion';
import { benefits } from '@/lib/dummyData/benefits';

const Benefits = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 lg:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16 lg:mb-20">
          <motion.h2 
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Why Choose Us?
          </motion.h2>
          <motion.p 
            className="text-lg sm:text-xl md:text-2xl text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Discover the exceptional advantages of using our platform
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center p-6 sm:p-7 md:p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white border-opacity-20 transform hover:-translate-y-1.5"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-center bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-full h-18 w-18 sm:h-20 sm:w-20 md:h-24 md:w-24 mb-5 sm:mb-6 shadow-md">
                <span className="material-symbols-outlined text-3xl sm:text-4xl">{benefit.icon}</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 leading-tight">
                {benefit.title}
              </h3>
              
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xs mx-auto">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;