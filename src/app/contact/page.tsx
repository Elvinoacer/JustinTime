"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  MessageSquare,
  User,
  Clock,
  HelpCircle,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";

const ContactPage = () => {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setIsSubmitted(true);
      setFormState({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const faqs = [
    {
      question: "How do I book a professional?",
      answer:
        "Simply browse our services or professionals, select the one that fits your needs, and click 'Book Now'. Follow the prompts to choose a time and confirm your booking.",
    },
    {
      question: "Is my payment secure?",
      answer:
        "Yes, all payments are processed through our secure payment gateway. We do not store your credit card information.",
    },
    {
      question: "Can I cancel a booking?",
      answer:
        "Yes, you can cancel a booking up to 24 hours before the scheduled time for a full refund. Check our cancellation policy for more details.",
    },
    {
      question: "How do I become a professional on JustinTime?",
      answer:
        "Click on 'Join as a Pro' in the header, fill out the application form, and our team will review your profile. Once approved, you can start accepting jobs.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 pt-16 pb-12 sm:pt-20 sm:pb-16 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>

        <div className="container mx-auto px-3 sm:px-4 relative z-10 text-center">
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              Get in Touch
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-emerald-50/90 leading-relaxed">
              Have questions? We'd love to hear from you. Our team is always
              here to help.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16 lg:py-20 -mt-6 sm:-mt-8 md:-mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Contact Info Cards - Mobile First */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Contact Information Card */}
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-5 sm:p-6 md:p-8 border border-gray-100"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                Contact Information
              </h3>

              <div className="space-y-4 sm:space-y-6">
                {/* Office Location */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Our Office
                    </h4>
                    <p className="text-gray-600 text-xs sm:text-sm mt-1">
                      123 Business Avenue, Westlands
                      <br />
                      Nairobi, Kenya
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Email Us
                    </h4>
                    <p className="text-gray-600 text-xs sm:text-sm mt-1">
                      support@justintime.co.ke
                      <br />
                      info@justintime.co.ke
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Call Us
                    </h4>
                    <p className="text-gray-600 text-xs sm:text-sm mt-1">
                      +254 790 670 542
                      <br />
                      <span className="text-gray-500">Mon-Fri 8am-5pm</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-100">
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-3">
                  Follow Us
                </h4>
                <div className="flex gap-2 sm:gap-3">
                  {[
                    { icon: Facebook, label: "Facebook" },
                    { icon: Twitter, label: "Twitter" },
                    { icon: Instagram, label: "Instagram" },
                    { icon: Linkedin, label: "LinkedIn" },
                  ].map((social, index) => (
                    <a
                      key={index}
                      href="#"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-emerald-500 hover:text-white transition-all duration-300 group"
                      aria-label={social.label}
                    >
                      <social.icon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Map Placeholder */}
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden h-48 sm:h-56 md:h-64 border border-gray-100 relative group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.19036281522!2d36.70730728775026!3d-1.3031933719272915!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi!5e0!3m2!1sen!2ske!4v1698765432100!5m2!1sen!2ske"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale group-hover:grayscale-0 transition-all duration-500"
                title="Nairobi Map"
              />
            </motion.div>

            {/* Quick Help - Mobile Only */}
            <div className="lg:hidden bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Quick Help
              </h4>
              <p className="text-blue-700 text-xs">
                Need immediate assistance? Try our{" "}
                <a href="/faq" className="font-semibold underline">
                  FAQ page
                </a>{" "}
                or call us directly.
              </p>
            </div>
          </div>

          {/* Contact Form & FAQ */}
          <div className="lg:col-span-2">
            {/* Contact Form */}
            <motion.div
              className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Send us a Message
                </h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Fill out the form below and we'll get back to you as soon as
                  possible.
                </p>
              </div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-100 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-red-700 text-sm"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                </motion.div>
              )}

              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 border border-emerald-100 rounded-lg sm:rounded-xl p-6 sm:p-8 text-center"
                >
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-emerald-800 mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-emerald-700 text-sm sm:text-base mb-4">
                    Thank you for contacting us. We will respond to your inquiry
                    shortly.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-emerald-600 font-semibold hover:text-emerald-700 underline text-sm sm:text-base"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 sm:space-y-6"
                >
                  {/* Name & Email - Stacked on mobile, side-by-side on larger screens */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="name"
                        className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1"
                      >
                        <User className="w-3 h-3" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formState.name}
                        onChange={handleChange}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formState.email}
                        onChange={handleChange}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <label
                      htmlFor="subject"
                      className="text-xs sm:text-sm font-medium text-gray-700"
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      value={formState.subject}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base"
                      placeholder="How can we help?"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="text-xs sm:text-sm font-medium text-gray-700"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      value={formState.message}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-gray-50 focus:bg-white text-sm sm:text-base resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3 sm:py-4 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </motion.div>

            {/* FAQ Section */}
            <motion.div
              className="mt-8 sm:mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                Frequently Asked Questions
              </h2>
              <div className="grid gap-3 sm:gap-4">
                {faqs.map((faq, index) => (
                  <FAQItem
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </motion.div>

            {/* Additional Contact Options - Mobile Only */}
            <div className="lg:hidden mt-8">
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                <h4 className="font-bold text-gray-900 text-sm mb-3">
                  Other Ways to Reach Us
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="tel:+254790670542"
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-xs font-medium text-gray-700">
                      Call Now
                    </span>
                  </a>
                  <a
                    href="mailto:support@justintime.co.ke"
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-xs font-medium text-gray-700">
                      Email Us
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Business Hours - Desktop Only */}
      <div className="hidden lg:block container mx-auto px-4 pb-12">
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 border border-gray-200 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            Business Hours
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { day: "Monday", hours: "8:00 AM - 5:00 PM" },
              { day: "Tuesday", hours: "8:00 AM - 5:00 PM" },
              { day: "Wednesday", hours: "8:00 AM - 5:00 PM" },
              { day: "Thursday", hours: "8:00 AM - 5:00 PM" },
              { day: "Friday", hours: "8:00 AM - 5:00 PM" },
              { day: "Saturday", hours: "9:00 AM - 1:00 PM" },
              { day: "Sunday", hours: "Closed" },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="font-semibold text-gray-900 text-sm mb-1">
                  {item.day}
                </div>
                <div className="text-gray-600 text-sm">{item.hours}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const FAQItem = ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors group"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-gray-800 text-sm sm:text-base pr-2">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 text-sm sm:text-base leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactPage;
