"use client";
import { motion } from "framer-motion";
import { useServices } from "@/lib/api/hooks/useServices";
import Link from "next/link";

const PopularServices = () => {
  const { data, isLoading } = useServices({ limit: 4, sort: "rating" });
  const services = data?.services || [];

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Popular Services
          </motion.h2>
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Discover the most sought-after services in your area, delivered by
            trusted professionals
          </motion.p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-96 animate-pulse shadow-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {services.map((service: any, index: number) => (
              <motion.div
                key={service.id}
                className="group flex flex-col bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-white border-opacity-20 transform hover:-translate-y-2"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Image container with overlay */}
                <div className="relative overflow-hidden">
                  <div
                    className="w-full h-40 sm:h-48 md:h-56 bg-center bg-no-repeat bg-cover transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url("${service.images?.[0] || service.imageUrl || '/images/placeholder.png'}")` }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Professional count badge - Mocked for now as API doesn't return this yet */}
                  {/* <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    {service.proCount}+ Pros
                  </div> */}

                  {/* Quick action button */}
                  <Link href={`/services/${service.id}`}>
                    <motion.button
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-lg"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Book Now
                    </motion.button>
                  </Link>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 flex-grow flex flex-col">
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-300">
                      {service.title || service.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  </div>

                  {/* Rating and pricing */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <span className="material-symbols-outlined !text-base">
                          star
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {(service.rating || 5.0).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-gray-500 text-xs ml-2">
                        ({service.reviews || 0} reviews)
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-700">
                        From Kes {Number(service.price || service.startingPrice || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Starting price</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* View All CTA */}
        <motion.div
          className="text-center mt-12 md:mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Link href="/services">
            <motion.button
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 px-8 rounded-xl font-semibold text-base hover:from-emerald-600 hover:to-green-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center mx-auto gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>View All Services</span>
              <span className="material-symbols-outlined text-lg">
                arrow_forward
              </span>
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default PopularServices;
