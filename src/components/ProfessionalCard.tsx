'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface ProfessionalCardProps {
  professional: {
    id: string;
    name: string;
    title?: string;
    image?: string | null;
    rating: number;
    reviews: number;
    hourlyRate: number;
    location?: string | null;
    skills: string[];
    completedJobs: number;
    memberSince: string;
    verified?: boolean;
    subscription?: {
      plan: string;
      isActive: boolean;
    };
    distance?: number;
  };
  index?: number;
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional, index = 0 }) => {
  const isPro = professional.subscription?.plan && 
    ["PRO", "BUSINESS"].includes(professional.subscription.plan) && 
    professional.subscription.isActive;
  
  const isVerified = professional.verified;

  // Format distance
  const formatDistance = (km?: number) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  };

  return (
    <motion.div
      className="group relative h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.03,
        ease: "easeOut",
      }}
    >
      <Link href={`/professionals/${professional.id}`} className="block h-full">
        <div className="relative h-full flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)] border border-gray-100 hover:border-emerald-200/50">
          
          {/* Top Section - Gradient Background with Avatar */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 pt-6 pb-12 px-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
            </div>

            {/* Badges Row */}
            <div className="relative flex justify-between items-start mb-4">
              {/* PRO Badge */}
              {isPro && (
                <motion.div 
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-lg shadow-amber-500/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <span className="text-white text-xs font-bold tracking-wide flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">workspace_premium</span>
                    PRO
                  </span>
                </motion.div>
              )}
              
              {/* Verified Badge */}
              {isVerified && !isPro && (
                <motion.div 
                  className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <span className="text-emerald-700 text-xs font-bold tracking-wide flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Verified
                  </span>
                </motion.div>
              )}
              
              {/* Distance Badge */}
              {professional.distance && (
                <motion.div 
                  className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg ml-auto"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">near_me</span>
                    {formatDistance(professional.distance)}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Price Badge - Floating */}
            <div className="absolute top-4 right-4">
              <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-white/50">
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">From</p>
                <p className="text-emerald-700 font-bold text-lg leading-none">
                  KES {professional.hourlyRate.toLocaleString()}
                  <span className="text-xs font-medium text-gray-500">/hr</span>
                </p>
              </div>
            </div>
          </div>

          {/* Avatar - Overlapping */}
          <div className="relative -mt-10 flex justify-center z-10">
            <div className="relative">
              {/* Gradient Ring */}
              <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 rounded-full p-[3px] shadow-lg shadow-emerald-500/30">
                <div className="w-full h-full bg-white rounded-full" />
              </div>
              
              {/* Avatar */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white border-4 border-white shadow-xl">
                {professional.image ? (
                  <Image
                    src={professional.image}
                    alt={professional.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                    <span className="text-3xl sm:text-4xl font-bold text-emerald-600">
                      {professional.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Online Indicator */}
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 flex flex-col flex-grow text-center">
            {/* Name */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
              {professional.name}
            </h3>
            
            {/* Title */}
            {professional.title && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                {professional.title}
              </p>
            )}

            {/* Rating Section */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`material-symbols-outlined text-base ${
                      i < Math.floor(professional.rating) 
                        ? "text-amber-400" 
                        : i < professional.rating 
                          ? "text-amber-300" 
                          : "text-gray-200"
                    }`}
                    style={{ fontVariationSettings: i < professional.rating ? '"FILL" 1' : '"FILL" 0' }}
                  >
                    star
                  </span>
                ))}
              </div>
              <span className="text-sm font-bold text-gray-900">{professional.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({professional.reviews} reviews)</span>
            </div>

            {/* Location */}
            {professional.location && (
              <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mb-3">
                <span className="material-symbols-outlined text-sm">location_on</span>
                <span className="truncate max-w-[180px]">{professional.location}</span>
              </div>
            )}

            {/* Skills */}
            {professional.skills.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {professional.skills.slice(0, 3).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100"
                  >
                    {skill}
                  </span>
                ))}
                {professional.skills.length > 3 && (
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    +{professional.skills.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mb-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-500">verified_user</span>
                <span>{professional.completedJobs} jobs</span>
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-gray-400">calendar_month</span>
                <span>Since {new Date(professional.memberSince).getFullYear()}</span>
              </div>
            </div>

            {/* CTA Button */}
            <motion.div
              className="mt-auto"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all">
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  View Profile
                  <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProfessionalCard;
