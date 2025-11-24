"use client";
import { motion } from "framer-motion";
import { professionals } from "@/lib/dummyData/featuredProfessionals";

const FeaturedProfessionals = () => {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {professionals.map((professional, index) => (
            <motion.div
              key={index}
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
                    backgroundImage: `url("${professional.avatarUrl}")`,
                  }}
                ></div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white !text-xs sm:!text-sm">
                      check
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                {professional.name}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {professional.title}
              </p>

              <div className="flex items-center gap-1 text-yellow-500 mt-3">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined !text-lg sm:!text-xl"
                    style={{
                      color:
                        i < Math.floor(professional.rating)
                          ? "#F59E0B"
                          : "#E5E7EB",
                    }}
                  >
                    {i < professional.rating
                      ? i === Math.floor(professional.rating) &&
                        professional.rating % 1 >= 0.5
                        ? "star_half"
                        : "star"
                      : "star"}
                  </span>
                ))}
                <span className="text-gray-800 font-medium ml-2 text-sm sm:text-base">
                  {professional.rating}
                </span>
              </div>

              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                ({professional.reviews} reviews)
              </p>

              <div className="w-full mt-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm sm:text-base">
                    Starting at
                  </span>
                  <span className="text-emerald-600 font-bold text-lg sm:text-xl">
                    Kes {professional.startingPrice}/hr
                  </span>
                </div>
              </div>

              <button className="mt-5 w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 px-4 rounded-xl font-medium text-sm sm:text-base hover:from-emerald-600 hover:to-green-700 transition-all duration-300 transform hover:-translate-y-0.5">
                View Profile
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-12 md:mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button className="border-2 border-emerald-500 text-emerald-600 font-semibold py-3 px-8 rounded-xl text-base sm:text-lg hover:bg-emerald-500 hover:text-white transition-all duration-300">
            View All Professionals
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProfessionals;
