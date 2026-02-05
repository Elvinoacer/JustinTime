'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    description?: string;
    imageUrl: string;
    category: string;
    startingPrice: number;
    rating: number;
    reviewCount: number;
    provider?: {
      name: string;
      image?: string;
      verified?: boolean;
    };
    isVerified?: boolean;
    distance?: number;
  };
  index?: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Format distance
  const formatDistance = (km?: number) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <motion.div
      className="group relative h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        ease: "easeOut",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/services/${service.id}`} className="block h-full">
        <div className="relative h-full flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)] border border-gray-100 hover:border-emerald-200/50">
          
          {/* Image Container with Parallax */}
          <div className="relative h-52 sm:h-64 w-full overflow-hidden">
            <motion.div
              className="absolute inset-0"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <Image
                src={service.imageUrl}
                alt={service.name}
                fill
                className="object-cover"
              />
            </motion.div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-70 group-hover:opacity-50 transition-opacity duration-500" />
            
            {/* Top Row - Category & Actions */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
              {/* Category Badge */}
              <motion.span 
                className="px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-full text-xs font-bold text-emerald-800 shadow-lg border border-white/50 flex items-center gap-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="material-symbols-outlined text-sm">category</span>
                {service.category}
              </motion.span>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                {/* Favorite Button */}
                <motion.button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsFavorited(!isFavorited);
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isFavorited 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                      : 'bg-white/90 backdrop-blur-md text-gray-600 hover:text-red-500 shadow-lg border border-white/50'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <span 
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: isFavorited ? '"FILL" 1' : '"FILL" 0' }}
                  >
                    favorite
                  </span>
                </motion.button>
                
                {/* Verified Badge */}
                {service.isVerified && (
                  <motion.div 
                    className="px-2 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-lg shadow-amber-500/30"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">workspace_premium</span>
                      PRO
                    </span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Distance Badge - Bottom Left */}
            {service.distance && (
              <motion.div 
                className="absolute bottom-4 left-4 z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="px-3 py-1.5 bg-emerald-500/90 backdrop-blur-md rounded-full shadow-lg flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-white text-sm">near_me</span>
                  <span className="text-white text-xs font-bold">{formatDistance(service.distance)} away</span>
                </div>
              </motion.div>
            )}
            
            {/* Price Badge - Floating Bottom Right */}
            <motion.div 
              className="absolute bottom-4 right-4 z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="px-4 py-2.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg flex flex-col items-end border border-white/50">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Starting at</span>
                <span className="text-xl font-bold text-emerald-700">
                  KES {service.startingPrice.toLocaleString()}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6 flex flex-col flex-grow">
            {/* Title & Rating Row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 flex-1">
                {service.name}
              </h3>
              
              {/* Rating Badge */}
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg flex-shrink-0">
                <span 
                  className="material-symbols-outlined text-amber-500 text-sm"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  star
                </span>
                <span className="text-sm font-bold text-gray-900">{service.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({service.reviewCount})</span>
              </div>
            </div>

            {/* Description */}
            {service.description && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-grow">
                {service.description}
              </p>
            )}

            {/* Footer: Provider Info & Action */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
              {service.provider && (
                <div className="flex items-center gap-3">
                  {service.provider.image ? (
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                        <Image
                          src={service.provider.image}
                          alt={service.provider.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      {service.provider.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="material-symbols-outlined text-white text-[8px]">check</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border-2 border-white shadow-md">
                      <span className="text-emerald-700 font-bold text-sm">
                        {service.provider.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {service.provider.name}
                    </p>
                    <p className="text-xs text-gray-500">Service Provider</p>
                  </div>
                </div>
              )}
              
              {/* Arrow Button */}
              <motion.div
                className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-400 group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white transition-all duration-300 shadow-md group-hover:shadow-emerald-300/50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <span className="material-symbols-outlined text-xl group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
              </motion.div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ServiceCard;
