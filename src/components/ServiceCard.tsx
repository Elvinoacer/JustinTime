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
    provider?: {
      name: string;
      image?: string | null;
      subscription?: {
        plan: string;
        isActive: boolean;
      };
    };
  };
  index?: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
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
    >
      <Link href={`/services/${service.id}`} className="block h-full">
        <div className="relative h-full flex flex-col bg-white rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-gray-100 hover:border-emerald-100/50">
          
          {/* Image Container */}
          <div className="relative h-64 w-full overflow-hidden">
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />

            {/* Top Badges */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-emerald-800 shadow-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">category</span>
                {service.category}
              </span>

              {/* Verified/PRO Badge */}
              {service.isVerified && (
                <span 
                  className={`px-3 py-1.5 backdrop-blur-md rounded-full text-xs font-bold shadow-sm flex items-center gap-1 ${
                    service.provider?.subscription?.plan && 
                    ["PRO", "BUSINESS"].includes(service.provider.subscription.plan) &&
                    service.provider.subscription.isActive
                      ? "bg-amber-500/90 text-white"
                      : "bg-emerald-500/90 text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] fill-current">verified</span>
                  {service.provider?.subscription?.plan && 
                   ["PRO", "BUSINESS"].includes(service.provider.subscription.plan) &&
                   service.provider.subscription.isActive
                    ? "PRO"
                    : "Verified"}
                </span>
              )}
            </div>

            {/* Price Badge (Floating) */}
            <div className="absolute bottom-4 right-4">
              <div className="px-4 py-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg flex flex-col items-end border border-white/20">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Starting at</span>
                <span className="text-lg font-bold text-emerald-700">
                  KES {service.startingPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col flex-grow">
            {/* Title & Rating */}
            <div className="mb-3">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">
                  {service.name}
                </h3>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <span className="material-symbols-outlined text-[18px] fill-current">star</span>
                  <span>{service.rating.toFixed(1)}</span>
                  <span className="text-gray-400 font-normal">({service.reviews})</span>
                </div>
                
                {service.distance !== undefined && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>{formatDistance(service.distance)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-6 flex-grow">
              {service.description}
            </p>

            {/* Footer: Provider Info & Action */}
            <div className="pt-5 border-t border-gray-100 flex items-center justify-between mt-auto">
              {service.provider && (
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100">
                    {service.provider.image ? (
                      <Image 
                        src={service.provider.image} 
                        alt={service.provider.name} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold text-xs">
                        {service.provider.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium">Provider</span>
                    <span className="text-sm font-bold text-gray-900 truncate max-w-[120px]">
                      {service.provider.name}
                    </span>
                  </div>
                </div>
              )}

              <motion.div 
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-emerald-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </motion.div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ServiceCard;
