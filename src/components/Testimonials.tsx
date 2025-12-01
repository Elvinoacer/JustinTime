"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";
import { testimonials } from "@/lib/dummyData/testimonials";
import { Star, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

const Testimonials = () => {
  const controls = useAnimation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    if (!isMobile) {
      controls.start({
        x: [0, -800],
        transition: {
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 25,
            ease: "linear",
          },
        },
      });
    }
  }, [controls, isMobile]);

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 sm:w-4 sm:h-4 ${
          i < rating
            ? "fill-yellow-500 text-yellow-500"
            : "fill-gray-200 text-gray-200"
        }`}
      />
    ));
  };

  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl sm:rounded-2xl md:rounded-3xl py-8 sm:py-12 md:py-16 lg:py-20 px-3 xs:px-4 sm:px-6 lg:px-8 mx-3 xs:mx-4 sm:mx-6 lg:mx-auto">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <motion.h2
            className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            What Our Users Say
          </motion.h2>
          <motion.p
            className="text-sm xs:text-base sm:text-lg md:text-xl text-gray-600 mt-2 sm:mt-3 max-w-2xl md:max-w-3xl mx-auto px-2 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true, margin: "-50px" }}
          >
            Discover why thousands trust JustInTime for their service needs
          </motion.p>
        </div>

        {/* Desktop Infinite Scroll */}
        <div className="hidden lg:block relative overflow-hidden">
          <motion.div className="flex gap-6 lg:gap-8" animate={controls}>
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col min-w-[300px] lg:min-w-[340px] xl:min-w-[380px] border border-gray-100 hover:border-emerald-100"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 xs:size-14 sm:size-16 border-3 sm:border-4 border-white shadow-sm sm:shadow-md flex-shrink-0"
                    style={{
                      backgroundImage: `url("${testimonial.avatarUrl}")`,
                    }}
                  ></div>
                  <div className="flex-1">
                    <p className="text-base sm:text-lg font-semibold text-gray-800">
                      {testimonial.name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      {testimonial.role}
                    </p>
                    <div className="flex items-center gap-0.5 sm:gap-1 mt-1.5 sm:mt-2">
                      {renderStars(testimonial.rating)}
                    </div>
                  </div>
                </div>

                <blockquote className="text-gray-700 text-sm sm:text-base leading-relaxed italic mb-4 sm:mb-5 flex-grow">
                  &quot;{testimonial.quote}&quot;
                </blockquote>

                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{testimonial.date}</p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">
                      Verified Customer
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-slate-50/90 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-slate-50/90 to-transparent z-10"></div>
        </div>

        {/* Mobile/Tablet Carousel */}
        <div className="lg:hidden relative">
          <motion.div
            key={currentIndex}
            className="bg-white p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 xs:size-12 sm:size-14 border-3 sm:border-4 border-white shadow-sm sm:shadow-md flex-shrink-0"
                style={{
                  backgroundImage: `url("${testimonials[currentIndex].avatarUrl}")`,
                }}
              ></div>
              <div className="flex-1">
                <p className="text-base sm:text-lg font-semibold text-gray-800">
                  {testimonials[currentIndex].name}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {testimonials[currentIndex].role}
                </p>
                <div className="flex items-center gap-0.5 sm:gap-1 mt-1.5 sm:mt-2">
                  {renderStars(testimonials[currentIndex].rating)}
                </div>
              </div>
            </div>

            <blockquote className="text-gray-700 text-xs sm:text-sm leading-relaxed italic mb-4 sm:mb-5">
              &quot;{testimonials[currentIndex].quote}&quot;
            </blockquote>

            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {testimonials[currentIndex].date}
              </p>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">
                  Verified
                </span>
              </div>
            </div>
          </motion.div>

          {/* Mobile Navigation */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-6">
            <button
              onClick={prevTestimonial}
              className="p-1.5 sm:p-2 rounded-full bg-white shadow-sm sm:shadow-md hover:bg-gray-50 transition-colors duration-300"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>

            <div className="flex gap-1.5 sm:gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextTestimonial}
              className="p-1.5 sm:p-2 rounded-full bg-white shadow-sm sm:shadow-md hover:bg-gray-50 transition-colors duration-300"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mt-8 sm:mt-12 md:mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          {[
            { number: "4.9/5", label: "Avg Rating" },
            { number: "2.5k+", label: "Customers" },
            { number: "98%", label: "Satisfied" },
            { number: "500+", label: "Verified Pros" },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm"
            >
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600">
                {stat.number}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
