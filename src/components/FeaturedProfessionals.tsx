"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";
import { Star, Check, StarHalf } from "lucide-react";

const FeaturedProfessionals = () => {
  const { data, isLoading } = useServices({ limit: 3, sort: "rating" });
  const services = data?.services || [];

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-500 text-yellow-500"
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <StarHalf
            key={i}
            className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-500 text-yellow-500"
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            className="w-3 h-3 sm:w-4 sm:h-4 fill-gray-200 text-gray-200"
          />
        );
      }
    }
    return stars;
  };

  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 xs:px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl sm:rounded-2xl md:rounded-3xl mx-3 xs:mx-4 sm:mx-6 lg:mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <motion.h2
            className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            Featured Professionals
          </motion.h2>
          <motion.p
            className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 mt-2 sm:mt-3 max-w-2xl md:max-w-3xl mx-auto px-2 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            Meet our top-rated professionals ready to help you
          </motion.p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl sm:rounded-2xl h-80 xs:h-96 animate-pulse shadow-md sm:shadow-lg"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {services.map((service: any, index: number) => (
              <motion.div
                key={service.id}
                className="bg-white p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center border border-gray-100 hover:border-emerald-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -2 }}
              >
                {/* Avatar with verification badge */}
                <div className="relative mb-4 sm:mb-5">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-16 xs:size-18 sm:size-20 md:size-24 border-3 sm:border-4 border-white shadow-md sm:shadow-lg"
                    style={{
                      backgroundImage: `url("${
                        service.provider?.image ||
                        service.images?.[0] ||
                        "/images/placeholder.png"
                      }")`,
                    }}
                  ></div>
                  {service.provider?.profile?.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 sm:p-1 shadow-sm">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Professional info */}
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 line-clamp-1">
                  {service.provider?.name || "Professional"}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-0.5 sm:mt-1 line-clamp-1">
                  {service.category?.name || service.category || "Service"}{" "}
                  Specialist
                </p>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-2 sm:mt-3">
                  {renderStars(service.rating || 5.0)}
                  <span className="text-gray-800 font-medium ml-1.5 text-xs sm:text-sm">
                    {(service.rating || 5.0).toFixed(1)}
                  </span>
                </div>

                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                  ({service.reviews || 0} reviews)
                </p>

                {/* Pricing */}
                <div className="w-full mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs sm:text-sm">
                      Starting at
                    </span>
                    <span className="text-emerald-600 font-bold text-sm sm:text-base md:text-lg">
                      Ksh{" "}
                      {Number(
                        service.price || service.startingPrice || 0
                      ).toLocaleString()}
                      /hr
                    </span>
                  </div>
                </div>

                {/* View Profile Button */}
                <Link
                  href={`/services/${service.id}`}
                  className="w-full mt-3 sm:mt-4"
                >
                  <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 sm:py-2.5 px-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-sm hover:shadow-md">
                    View Profile
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* View All Professionals Button */}
        <motion.div
          className="text-center mt-8 sm:mt-12 md:mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <Link href="/services">
            <button className="border border-emerald-500 text-emerald-600 font-semibold py-2 sm:py-2.5 px-6 sm:px-8 rounded-lg sm:rounded-xl text-sm sm:text-base hover:bg-emerald-50 transition-all duration-300 min-w-[140px]">
              View All Professionals
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
