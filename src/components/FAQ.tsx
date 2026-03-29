"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do I book a professional on JustInTime?",
    answer:
      'Simply search for the service you need, browse available professionals in your area, compare ratings and reviews, then click "Book Now" to schedule. You\'ll receive confirmation instantly via SMS and email.',
  },
  {
    question: "Are the professionals verified?",
    answer:
      "Yes. Every professional on JustInTime goes through a thorough verification process including ID verification, background checks, and skills assessment. Look for the verified badge on their profiles.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept M-Pesa, Airtel Money, bank transfers, and all major debit/credit cards. All payments are processed securely through our platform — you never pay the professional directly.",
  },
  {
    question: "What if I'm not satisfied with the service?",
    answer:
      "We offer a satisfaction guarantee. If you're not happy with the work, contact our support team within 48 hours and we'll arrange a redo or refund. Your satisfaction is our priority.",
  },
  {
    question: "How do I become a professional on JustInTime?",
    answer:
      'Click "Join as a Pro" and complete the registration form. You\'ll need to provide identification, proof of skills or certification, and pass our verification process. Once approved, you can start receiving job requests.',
  },
  {
    question: "Is there a cancellation fee?",
    answer:
      "You can cancel for free up to 4 hours before the scheduled service. Cancellations within 4 hours may incur a small fee to compensate the professional for their time.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
      aria-label="Frequently asked questions"
    >
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <motion.div
          className="mb-8 text-center sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold text-emerald-400 backdrop-blur-sm sm:text-xs">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            FAQ
          </div>
          <h2 className="landing-display text-[1.5rem] font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Questions before you book?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60 sm:text-base">
            Clear answers on verification, payments, guarantees, and
            cancellations.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                className={`rounded-xl border transition-all duration-300 ${
                  isOpen
                    ? "border-emerald-400/40 bg-white/[0.06] shadow-[0_0_20px_-8px_rgba(52,211,153,0.2)]"
                    : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.12]"
                }`}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true, margin: "-30px" }}
              >
                <button
                  className="w-full flex items-center justify-between p-4 text-left sm:p-5"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  id={`faq-button-${index}`}
                >
                  <span className="pr-4 text-sm font-medium text-white/90 sm:text-base">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-colors ${isOpen ? "text-emerald-400" : "text-white/40"}`}
                      aria-hidden="true"
                    />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-button-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <p className="text-sm leading-[1.7] text-white/60">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
