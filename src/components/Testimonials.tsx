"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { testimonials } from "@/lib/dummyData/testimonials";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextTestimonial = () => setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  const prevTestimonial = () => setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));

  const renderStars = (rating: number) =>
    [...Array(5)].map((_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-gray-700 text-gray-700"}`} />
    ));

  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Desktop Layout — Two testimonials side by side with large quotes */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {testimonials.slice(0, 2).map((t, index) => (
            <motion.div
              key={index}
              className="relative backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-8"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true, margin: "-50px" }}
            >
              {/* Large emerald quote mark */}
              <Quote className="w-10 h-10 text-emerald-500/30 mb-4 rotate-180" />

              <blockquote className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
                {t.quote}
              </blockquote>

              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <div
                  className="w-10 h-10 rounded-full bg-center bg-cover ring-2 ring-emerald-500/20 ring-offset-1 ring-offset-[#0a1a15]"
                  style={{ backgroundImage: `url("${t.avatarUrl}")` }}
                />
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {renderStars(t.rating)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional testimonials row on desktop */}
        <div className="hidden md:grid md:grid-cols-3 gap-5 mt-5">
          {testimonials.slice(2, 5).map((t, index) => (
            <motion.div
              key={index}
              className="backdrop-blur-sm bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
              viewport={{ once: true, margin: "-50px" }}
            >
              <div className="flex items-center gap-0.5 mb-3">
                {renderStars(t.rating)}
              </div>
              <blockquote className="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-3">
                {t.quote}
              </blockquote>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full bg-center bg-cover"
                  style={{ backgroundImage: `url("${t.avatarUrl}")` }}
                />
                <div>
                  <p className="text-white text-xs font-semibold">{t.name}</p>
                  <p className="text-gray-500 text-[10px]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <motion.div
            key={currentIndex}
            className="backdrop-blur-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Quote className="w-8 h-8 text-emerald-500/30 mb-3 rotate-180" />
            <blockquote className="text-gray-300 text-sm leading-relaxed mb-4">
              {testimonials[currentIndex].quote}
            </blockquote>
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <div
                className="w-9 h-9 rounded-full bg-center bg-cover ring-2 ring-emerald-500/20 ring-offset-1 ring-offset-[#0a1a15]"
                style={{ backgroundImage: `url("${testimonials[currentIndex].avatarUrl}")` }}
              />
              <div>
                <p className="text-white text-sm font-semibold">{testimonials[currentIndex].name}</p>
                <p className="text-gray-500 text-xs">{testimonials[currentIndex].role}</p>
              </div>
              <div className="ml-auto flex items-center gap-0.5">
                {renderStars(testimonials[currentIndex].rating)}
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <button onClick={prevTestimonial} className="p-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] transition-colors" aria-label="Previous">
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, index) => (
                <button key={index} onClick={() => setCurrentIndex(index)} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-emerald-400 w-5" : "bg-gray-600"}`} aria-label={`Testimonial ${index + 1}`} />
              ))}
            </div>
            <button onClick={nextTestimonial} className="p-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] transition-colors" aria-label="Next">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
