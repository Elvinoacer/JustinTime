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
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:text-xs">
            Client Stories
          </p>
          <h2 className="landing-display text-[1.5rem] font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            What customers say after booking
          </h2>
        </motion.div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {testimonials.slice(0, 2).map((t, index) => (
            <motion.div
              key={index}
              className="glass-card relative rounded-2xl p-6 sm:p-8"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true, margin: "-50px" }}
            >
              <Quote className="mb-4 h-10 w-10 rotate-180 text-emerald-400/30" aria-hidden="true" />

              <blockquote className="mb-6 text-sm leading-relaxed text-white/80 sm:text-base">
                {t.quote}
              </blockquote>

              <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
                <div
                  className="h-10 w-10 rounded-full bg-cover bg-center ring-2 ring-emerald-400/40 ring-offset-1 ring-offset-[#0a0f0d]"
                  style={{ backgroundImage: `url("${t.avatarUrl}")` }}
                />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t.name}
                  </p>
                  <p className="text-xs text-white/50">{t.role}</p>
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
              className="glass-card rounded-2xl p-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
              viewport={{ once: true, margin: "-50px" }}
            >
              <div className="flex items-center gap-0.5 mb-3">
                {renderStars(t.rating)}
              </div>
              <blockquote className="mb-4 line-clamp-3 text-xs leading-relaxed text-white/60">
                {t.quote}
              </blockquote>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full bg-center bg-cover ring-1 ring-white/[0.1]"
                  style={{ backgroundImage: `url("${t.avatarUrl}")` }}
                />
                <div>
                  <p className="text-xs font-semibold text-white">
                    {t.name}
                  </p>
                  <p className="text-[10px] text-white/50">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile Carousel — enhanced with better spacing and touch targets */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="glass-card rounded-2xl p-5"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <Quote
                className="mb-3 h-8 w-8 rotate-180 text-emerald-400/30"
                aria-hidden="true"
              />
              <blockquote className="mb-4 text-[0.9375rem] leading-relaxed text-white/80">
                {testimonials[currentIndex].quote}
              </blockquote>
              <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
                <div
                  className="h-10 w-10 shrink-0 rounded-full bg-cover bg-center ring-2 ring-emerald-400/40 ring-offset-1 ring-offset-[#0a0f0d]"
                  style={{
                    backgroundImage: `url("${testimonials[currentIndex].avatarUrl}")`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {testimonials[currentIndex].name}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {testimonials[currentIndex].role}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-0.5 shrink-0">
                  {renderStars(testimonials[currentIndex].rating)}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-5 mt-6">
            <button
              onClick={prevTestimonial}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-colors hover:border-emerald-400/30 hover:bg-white/[0.08]"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4 text-white/60" />
            </button>
            <div className="flex gap-2" role="tablist">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  role="tab"
                  aria-selected={index === currentIndex}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "w-6 bg-emerald-400" : "w-2 bg-white/20"}`}
                  aria-label={`Testimonial ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-colors hover:border-emerald-400/30 hover:bg-white/[0.08]"
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
