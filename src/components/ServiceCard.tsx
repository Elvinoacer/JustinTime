'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistance } from '@/lib/utils/geolocation';

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    category: string;
    description: string;
    rating: number;
    reviews: number;
    startingPrice: number;
    isVerified: boolean;
    imageUrl: string;
    distance?: number;
  };
  index?: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ y: -8 }}
    >
      <Link href={`/services/${service.id}`}>
        {/* Card Container */}
        <div className="relative h-full overflow-hidden rounded-3xl bg-white shadow-lg transition-all duration-500 group-hover:shadow-2xl">
          {/* Gradient Border Effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[2px]">
            <div className="h-full w-full rounded-3xl bg-white"></div>
          </div>

          <div className="relative z-10">
            {/* Image Section */}
            <div className="relative h-56 sm:h-64 overflow-hidden rounded-t-3xl">
              <Image
                src={service.imageUrl}
                alt={service.name}
                fill
                className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-2"
              />

              {/* Gradient Overlay - Always visible but intensifies on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition-all duration-500"></div>

              {/* Floating Action Button */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={false}
              >
                <motion.div
                  className="bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl"
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <span className="material-symbols-outlined text-3xl text-emerald-600">arrow_forward</span>
                </motion.div>
              </motion.div>

              {/* Top Badges Row */}
              <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
                {/* Verified Badge */}
                {service.isVerified && (
                  <motion.div
                    className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 px-3.5 py-2 shadow-xl backdrop-blur-sm"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  >
                    <span className="material-symbols-outlined text-sm text-white fill-current">verified</span>
                    <span className="text-xs font-bold text-white">Verified Pro</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 flex flex-col flex-grow">
              {/* Category Tag & Rating Row */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">category</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 uppercase tracking-wide">
                    {service.category}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                   <span className="material-symbols-outlined text-amber-500 text-lg fill-current">star</span>
                   <span className="font-bold text-gray-900">{service.rating.toFixed(1)}</span>
                   <span className="text-xs text-gray-500">({service.reviews})</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors duration-300 line-clamp-1">
                {service.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-6 flex-grow">
                {service.description}
              </p>
              
              {/* Price Row */}
              <div className="mb-6 flex items-end justify-between border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Starting at</p>
                  <p className="text-2xl font-bold text-gray-900">
                    KES {service.startingPrice.toLocaleString()}
                  </p>
                </div>
                {service.distance !== undefined && (
                  <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    <span className="material-symbols-outlined text-sm">near_me</span>
                    <span className="text-xs font-bold">{formatDistance(service.distance)}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <motion.div
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 p-[2px] shadow-md group-hover:shadow-xl transition-shadow duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 group-hover:bg-gradient-to-r group-hover:from-emerald-500 group-hover:to-green-600 transition-all duration-300">
                  <span className="text-base font-bold text-emerald-600 group-hover:text-white transition-colors">
                    View Profile
                  </span>
                  <motion.span
                    className="material-symbols-outlined text-emerald-600 group-hover:text-white transition-colors text-xl"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    arrow_forward
                  </motion.span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ServiceCard;
