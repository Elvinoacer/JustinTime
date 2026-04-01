"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { testimonials } from "@/lib/dummyData/testimonials";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === testimonials.length - 1 ? 0 : prev + 1,
      );
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextTestimonial = () =>
    setCurrentIndex((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1,
    );
  const prevTestimonial = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1,
    );

  const renderStars = (rating: number) =>
    [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"}`}
        aria-hidden="true"
      />
    ));

  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Client testimonials"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-20px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-400 sm:text-xs">
            Client Stories
          </p>
          <h2 className="gradient-text-rose landing-display text-[1.5rem] font-bold tracking-tight sm:text-3xl md:text-4xl">
            What customers say after booking
          </h2>
        </motion.div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {testimonials.slice(0, 2).map((t, index) => (
            <motion.div
              key={index}
              className={`glass-card relative overflow-hidden rounded-2xl p-6 sm:p-8 border-l-[3px] ${index === 0 ? "border-l-rose-400/40" : "border-l-amber-400/40"} ${index === 1 ? "md:mt-8" : ""}`}
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: [0.23, 1, 0.32, 1],
              }}
              viewport={{ once: true, margin: "-20px" }}
            >
              <Quote
                className="absolute -top-2 -left-2 h-20 w-20 rotate-180 text-rose-400/[0.07]"
                aria-hidden="true"
              />
              <blockquote className="relative z-10 mb-6 text-sm leading-relaxed text-white/80 sm:text-base">
                {t.quote}
              </blockquote>
              <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
                <div
                  className="h-10 w-10 rounded-full bg-cover bg-center ring-2 ring-rose-400/30 ring-offset-1 ring-offset-[#0a0f0d] shrink-0"
                  style={{ backgroundImage: `url("${t.avatarUrl}")` }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-white/65 truncate">{t.role}</p>
                </div>
                <div className="ml-auto flex items-center gap-0.5 shrink-0">
                  {renderStars(t.rating)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-5 mt-5">
          {testimonials.slice(2, 5).map((t, index) => (
            <motion.div
              key={index}
              className="glass-card rounded-2xl p-5 border-t border-rose-400/15 transition-all duration-300 hover:border-rose-400/30"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.2 + index * 0.08,
                ease: [0.23, 1, 0.32, 1],
              }}
              viewport={{ once: true, margin: "-20px" }}
            >
              <div className="flex items-center gap-0.5 mb-3">
                {renderStars(t.rating)}
              </div>
              <blockquote className="mb-4 line-clamp-3 text-xs leading-relaxed text-white/70">
                {t.quote}
              </blockquote>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full bg-center bg-cover ring-1 ring-rose-400/20 shrink-0"
                  style={{ backgroundImage: `url("${t.avatarUrl}")` }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {t.name}
                  </p>
                  <p className="text-[10px] text-white/65 truncate">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="glass-card rounded-2xl p-5 border-l-[3px] border-l-rose-400/40"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <Quote
                className="mb-3 h-8 w-8 rotate-180 text-rose-400/30"
                aria-hidden="true"
              />
              <blockquote className="mb-4 text-[0.9375rem] leading-relaxed text-white/80">
                {testimonials[currentIndex].quote}
              </blockquote>
              <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
                <div
                  className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center ring-2 ring-rose-400/30 ring-offset-1 ring-offset-[#0a0f0d]"
                  style={{
                    backgroundImage: `url("${testimonials[currentIndex].avatarUrl}")`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {testimonials[currentIndex].name}
                  </p>
                  <p className="text-xs text-white/65 truncate">
                    {testimonials[currentIndex].role}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-0.5 shrink-0">
                  {renderStars(testimonials[currentIndex].rating)}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-5 mt-6">
            <button
              onClick={prevTestimonial}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-colors hover:border-rose-400/30 hover:bg-white/[0.08]"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4 text-white/60" />
            </button>
            <div className="flex gap-1.5" role="tablist">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  role="tab"
                  aria-selected={index === currentIndex}
                  onClick={() => setCurrentIndex(index)}
                  className={`touch-target-exempt h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? "w-4 bg-rose-400" : "w-1.5 bg-white/20"}`}
                  style={{ minWidth: 0, minHeight: 0 }}
                  aria-label={`Testimonial ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-colors hover:border-rose-400/30 hover:bg-white/[0.08]"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
