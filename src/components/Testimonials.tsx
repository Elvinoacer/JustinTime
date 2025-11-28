"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";
import { testimonials } from "@/lib/dummyData/testimonials";

const Testimonials = () => {
  const controls = useAnimation();

  const [currentIndex, setCurrentIndex] = useState(0);

  // For mobile carousel
  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  };

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      controls.start({
        x: [0, -1030],
        transition: {
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 30,
            ease: "linear",
          },
        },
      });
    }
  }, [controls]);



  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            What Our Users Say
          </motion.h2>
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-gray-600 mt-3 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Discover why thousands of customers trust JustInTime for their
            service needs
          </motion.p>
        </div>

        {/* Desktop Infinite Scroll */}
        <div className="hidden lg:block relative overflow-hidden">
          <motion.div
            className="flex gap-6 lg:gap-8"
            animate={controls}
            onMouseEnter={() => {}}
      onMouseLeave={() => {}}
          >
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 sm:p-7 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col min-w-[320px] lg:min-w-[380px] border border-white border-opacity-20 transform hover:-translate-y-1"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-14 sm:size-16 border-4 border-white shadow-md flex-shrink-0"
                    style={{
                      backgroundImage: `url("${testimonial.avatarUrl}")`,
                    }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-800">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {testimonial.role}
                    </p>
                    <div className="flex items-center gap-1 text-yellow-500 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined !text-lg ${
                            i < testimonial.rating
                              ? "text-yellow-500"
                              : "text-gray-300"
                          }`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <blockquote className="text-gray-700 text-base leading-relaxed italic mb-6 flex-grow">
                  &quot;{testimonial.quote}&quot;
                </blockquote>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">{testimonial.date}</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-lg">
                      verified
                    </span>
                    <span className="text-xs text-emerald-600 font-medium">
                      Verified Customer
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50/90 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50/90 to-transparent z-10"></div>
        </div>

        {/* Mobile/Tablet Carousel */}
        <div className="lg:hidden relative">
          <motion.div
            key={currentIndex}
            className="bg-white p-6 rounded-2xl shadow-lg border border-white border-opacity-20"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-14 border-4 border-white shadow-md flex-shrink-0"
                style={{
                  backgroundImage: `url("${testimonials[currentIndex].avatarUrl}")`,
                }}
              ></div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-800">
                  {testimonials[currentIndex].name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {testimonials[currentIndex].role}
                </p>
                <div className="flex items-center gap-1 text-yellow-500 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`material-symbols-outlined !text-base ${
                        i < testimonials[currentIndex].rating
                          ? "text-yellow-500"
                          : "text-gray-300"
                      }`}
                    >
                      {i < testimonials[currentIndex].rating ? "star" : "star"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <blockquote className="text-gray-700 text-sm leading-relaxed italic mb-6">
              &quot;{testimonials[currentIndex].quote}&quot;
            </blockquote>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {testimonials[currentIndex].date}
              </p>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-emerald-500 text-sm">
                  verified
                </span>
                <span className="text-xs text-emerald-600 font-medium">
                  Verified
                </span>
              </div>
            </div>
          </motion.div>

          {/* Mobile Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prevTestimonial}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors duration-300"
            >
              <span className="material-symbols-outlined text-gray-700">
                chevron_left
              </span>
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextTestimonial}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors duration-300"
            >
              <span className="material-symbols-outlined text-gray-700">
                chevron_right
              </span>
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          {[
            { number: "4.9/5", label: "Average Rating" },
            { number: "2,500+", label: "Happy Customers" },
            { number: "98%", label: "Satisfaction Rate" },
            { number: "500+", label: "Verified Pros" },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 shadow-sm"
            >
              <div className="text-2xl font-bold text-emerald-600">
                {stat.number}
              </div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
