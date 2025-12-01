"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

const PopularServices = () => {
  const { data, isLoading } = useServices({ limit: 4, sort: "rating" });
  const services = data?.services || [];

  return (
    <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 xs:px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl sm:rounded-2xl md:rounded-3xl mx-3 xs:mx-4 sm:mx-6 lg:mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <motion.h2
            className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            Popular Services
          </motion.h2>
          <motion.p
            className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 mt-2 sm:mt-3 max-w-2xl md:max-w-3xl mx-auto px-2 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            Most sought-after services delivered by trusted professionals
          </motion.p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl sm:rounded-2xl h-72 xs:h-80 sm:h-96 animate-pulse shadow-md sm:shadow-lg"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {services.map((service: any, index: number) => (
              <motion.div
                key={service.id}
                className="group flex flex-col bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-emerald-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -4 }}
              >
                {/* Image container with overlay */}
                <div className="relative overflow-hidden">
                  <div
                    className="w-full h-36 xs:h-40 sm:h-48 md:h-56 bg-center bg-no-repeat bg-cover transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url("${
                        service.images?.[0] ||
                        service.imageUrl ||
                        "/images/placeholder.png"
                      }")`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
                  </div>

                  {/* Quick action button */}
                  <Link href={`/services/${service.id}`} className="block">
                    <motion.button
                      className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Book Now
                    </motion.button>
                  </Link>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 md:p-6 flex-grow flex flex-col">
                  <div className="flex-grow">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-300 line-clamp-1">
                      {service.title || service.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  </div>

                  {/* Rating and pricing */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 ml-0.5">
                          {(service.rating || 5.0).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-gray-500 text-xs ml-2">
                        ({service.reviews || 0})
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold text-emerald-700">
                        From Ksh{" "}
                        {Number(
                          service.price || service.startingPrice || 0
                        ).toLocaleString()}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        Starting price
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* View All CTA */}
        <motion.div
          className="text-center mt-8 sm:mt-12 md:mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <Link href="/services">
            <motion.button
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center mx-auto gap-1.5 sm:gap-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>View All Services</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularServices;
