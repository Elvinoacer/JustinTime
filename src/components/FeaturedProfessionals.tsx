"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";

const FeaturedProfessionals = () => {
  // Fetch services to get professionals. 
  // In a real app, we might want a dedicated endpoint for "top professionals"
  // but for now, we can show the providers of the top rated services.
  const { data, isLoading } = useServices({ limit: 3, sort: "rating" });
  const services = data?.services || [];

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Featured Professionals
          </motion.h2>
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Meet our top-rated professionals ready to help you
          </motion.p>
        </div>

        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
             {[...Array(3)].map((_, i) => (
               <div key={i} className="bg-white rounded-2xl h-96 animate-pulse shadow-lg" />
             ))}
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {services.map((service: any, index: number) => (
              <motion.div
                key={service.id}
                className="bg-white p-6 sm:p-7 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center border border-white border-opacity-20 transform hover:-translate-y-1.5"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative mb-5">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-20 sm:size-24 md:size-28 border-4 border-white shadow-lg"
                    style={{
                      // Use provider avatar if available, else service image as fallback
                      backgroundImage: `url("${service.provider?.image || service.images?.[0] || '/images/placeholder.png'}")`,
                    }}
                  ></div>
                  {service.provider?.profile?.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white !text-xs sm:!text-sm">
                          check
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {service.provider?.name || "Professional"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {service.category?.name || service.category || "Service"} Specialist
                </p>

                <div className="flex items-center gap-1 text-yellow-500 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined !text-lg sm:!text-xl"
                      style={{
                        color:
                          i < Math.floor(service.rating)
                            ? "#F59E0B"
                            : "#E5E7EB",
                      }}
                    >
                      {i < service.rating
                        ? i === Math.floor(service.rating) &&
                          service.rating % 1 >= 0.5
                          ? "star_half"
                          : "star"
                        : "star"}
                    </span>
                  ))}
                  <span className="text-gray-800 font-medium ml-2 text-sm sm:text-base">
                    {(service.rating || 5.0).toFixed(1)}
                  </span>
                </div>

                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  ({service.reviews || 0} reviews)
                </p>

                <div className="w-full mt-5 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm sm:text-base">
                      Starting at
                    </span>
                    <span className="text-emerald-600 font-bold text-lg sm:text-xl">
                      Kes {Number(service.price || service.startingPrice || 0).toLocaleString()}/hr
                    </span>
                  </div>
                </div>

                <Link href={`/services/${service.id}`} className="w-full mt-5">
                  <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 px-4 rounded-xl font-medium text-sm sm:text-base hover:from-emerald-600 hover:to-green-700 transition-all duration-300 transform hover:-translate-y-0.5">
                    View Profile
                  </button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          className="text-center mt-12 md:mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Link href="/services">
            <button className="border-2 border-emerald-500 text-emerald-600 font-semibold py-3 px-8 rounded-xl text-base sm:text-lg hover:bg-emerald-500 hover:text-white transition-all duration-300">
              View All Professionals
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
