"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do I book a professional on JustInTime?",
    answer:
      "Simply search for the service you need, browse available professionals in your area, compare ratings and reviews, then click \"Book Now\" to schedule. You'll receive confirmation instantly via SMS and email.",
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
      "Click \"Join as a Pro\" and complete the registration form. You'll need to provide identification, proof of skills or certification, and pass our verification process. Once approved, you can start receiving job requests.",
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
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-10 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            FAQ
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-gray-500 text-sm sm:text-base max-w-md mx-auto">
            Everything you need to know about JustInTime.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={index}
                className={`backdrop-blur-sm rounded-xl border transition-all duration-300 ${
                  isOpen
                    ? "bg-white/[0.06] border-emerald-500/20"
                    : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                }`}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true, margin: "-30px" }}
              >
                <button
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-white text-sm sm:text-base font-medium pr-4">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className={`w-4 h-4 transition-colors ${isOpen ? "text-emerald-400" : "text-gray-500"}`} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
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
