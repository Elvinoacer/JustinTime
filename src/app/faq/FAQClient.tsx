"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import {
  ChevronDown,
  Search,
  HelpCircle,
  CreditCard,
  Shield,
  Users,
  Settings,
  Phone,
  Mail,
  MessageCircle,
  Filter,
  X,
} from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: "Getting Started",
    question: "How do I create an account?",
    answer:
      "Creating an account is simple! Click the 'Sign Up' button in the top right corner, choose whether you're a client looking for services or a professional offering services, and fill in your basic information. You'll receive a verification email to activate your account.",
  },
  {
    category: "Getting Started",
    question: "How do I post a job?",
    answer:
      "To post a job, sign up as a client, go to your dashboard, and click on 'Post a Job'. Describe your needs, set your budget, add photos if relevant, and specify your preferred timeline.",
  },
  {
    category: "Getting Started",
    question: "How do I find service providers?",
    answer:
      "You can browse service providers by category on our homepage, use the search function to find specific skills, or post a job and let professionals come to you.",
  },
  {
    category: "Payments & Pricing",
    question: "Is it free to join?",
    answer:
      "Yes, joining JustInTime is completely free for both clients and service providers. We charge a small service fee (10%) only on successful bookings.",
  },
  {
    category: "Payments & Pricing",
    question: "How do I pay for services?",
    answer:
      "You can pay securely through our platform using M-Pesa, credit/debit cards, or bank transfer. Payments are held in escrow until the job is completed to your satisfaction.",
  },
  {
    category: "Payments & Pricing",
    question: "When do service providers get paid?",
    answer:
      "Service providers receive payment within 24-48 hours after you confirm the job is completed satisfactorily.",
  },
  {
    category: "Payments & Pricing",
    question: "What are the fees?",
    answer:
      "Clients pay the agreed service amount plus a 10% platform fee. Service providers pay a 10% commission on their earnings.",
  },
  {
    category: "Safety & Trust",
    question: "Are the service providers verified?",
    answer:
      "Yes, we verify the identity and credentials of our service providers through ID verification, skill assessments, and background checks where applicable.",
  },
  {
    category: "Safety & Trust",
    question: "What if I'm not satisfied with the service?",
    answer:
      "We have a dispute resolution process. If you're not satisfied, contact our support team within 48 hours of service completion.",
  },
  {
    category: "Safety & Trust",
    question: "How do you protect my personal information?",
    answer:
      "We use industry-standard encryption to protect your data. Your payment information is never stored on our servers.",
  },
  {
    category: "Services",
    question: "What types of services are available?",
    answer:
      "We offer a wide range of services including plumbing, electrical work, cleaning, carpentry, painting, gardening, and much more.",
  },
  {
    category: "Services",
    question: "Can I schedule recurring services?",
    answer:
      "Absolutely! Many of our service providers offer recurring bookings for regular services at discounted rates.",
  },
  {
    category: "Services",
    question: "How far in advance should I book?",
    answer:
      "For standard services, 24-48 hours is usually sufficient. For specialized services or peak times, book at least a week in advance.",
  },
  {
    category: "Support",
    question: "How can I contact customer support?",
    answer:
      "You can reach our support team via the in-app chat, email at support@gtss.software, or call us at +254 790 670 542.",
  },
  {
    category: "Support",
    question: "Can I cancel or reschedule a booking?",
    answer:
      "Yes, you can cancel or reschedule up to 24 hours before the scheduled time without penalty.",
  },
];

const categories = [
  "All",
  "Getting Started",
  "Payments & Pricing",
  "Safety & Trust",
  "Services",
  "Support",
];

const categoryIcons: Record<string, any> = {
  "Getting Started": HelpCircle,
  "Payments & Pricing": CreditCard,
  "Safety & Trust": Shield,
  Services: Settings,
  Support: Phone,
  All: Users,
};

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      <Header />
      <main className="flex-1 px-3 sm:px-4 py-6 sm:py-8 md:py-12 pt-20 sm:pt-24">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg shadow-emerald-500/30">
              <HelpCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto px-2">
              Find answers to common questions about JustInTime. Can't find what
              you're looking for? Contact our support team.
            </p>
          </div>

          {/* Search Bar & Mobile Filter Button */}
          <div className="mb-6 sm:mb-8 px-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search for questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-12 pr-4 py-3 sm:py-4 bg-white border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all text-sm sm:text-base"
                />
              </div>
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="sm:hidden flex items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                aria-label="Filter categories"
              >
                {showMobileFilters ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Filter className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Filter Overlay */}
          {showMobileFilters && (
            <div className="sm:hidden fixed inset-x-0 top-20 z-50 bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-top">
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category];
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowMobileFilters(false);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full font-medium text-sm transition-all ${
                          selectedCategory === category
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Category Filters - Desktop */}
          <div className="hidden sm:flex flex-wrap gap-2 sm:gap-3 justify-center mb-6 sm:mb-10">
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-medium text-sm sm:text-base transition-all transform hover:scale-105 active:scale-95 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category}
                </button>
              );
            })}
          </div>

          {/* Active Filter Display - Mobile */}
          <div className="sm:hidden mb-4 px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {selectedCategory === "All"
                    ? "All Categories"
                    : selectedCategory}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {filteredFaqs.length}{" "}
                  {filteredFaqs.length === 1 ? "question" : "questions"}
                </span>
              </div>
              {(selectedCategory !== "All" || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSearchQuery("");
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* FAQ List */}
          <div className="space-y-3 sm:space-y-4">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-600 text-base sm:text-lg">
                  No FAQs found matching your search.
                </p>
                <p className="text-gray-500 text-sm mt-1 sm:mt-2">
                  Try different keywords or browse all categories.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isOpen = openIndex === index;
                const Icon = categoryIcons[faq.category];

                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg sm:rounded-xl border border-gray-100 overflow-hidden transition-all hover:shadow-md hover:border-emerald-200 group"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full px-4 py-3 sm:px-6 sm:py-4 flex items-start gap-3 sm:gap-4 text-left transition-colors group-hover:bg-gray-50"
                    >
                      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-emerald-200 transition-colors">
                        <Icon className="w-4 h-4 sm:w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-emerald-600 mb-1 block">
                              {faq.category}
                            </span>
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors truncate">
                              {faq.question}
                            </h3>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 sm:w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                              isOpen ? "rotate-180 text-emerald-600" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="px-4 pb-3 sm:px-6 sm:pb-4 pl-11 sm:pl-20">
                        <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Contact Support CTA */}
          <div className="mt-8 sm:mt-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 text-center shadow-xl shadow-emerald-500/20">
            <Phone className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white/90 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
              Still have questions?
            </h2>
            <p className="text-emerald-50/90 text-sm sm:text-base mb-4 sm:mb-6 max-w-2xl mx-auto px-2">
              Our support team is here to help. Reach out via chat, email, or
              phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-emerald-600 font-semibold rounded-lg sm:rounded-xl hover:bg-emerald-50 transition-colors shadow-lg text-sm sm:text-base"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                Contact Support
              </a>
              <a
                href="tel:+254790670542"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-700 text-white font-semibold rounded-lg sm:rounded-xl hover:bg-emerald-800 transition-colors text-sm sm:text-base"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                Call +254 790 670 542
              </a>
            </div>

            {/* Additional Contact Options */}
            <div className="mt-6 pt-6 border-t border-emerald-400/30">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <a
                  href="mailto:support@gtss.software"
                  className="inline-flex items-center gap-2 text-emerald-50 hover:text-white transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  support@gtss.software
                </a>
                <span className="text-emerald-400/50 hidden sm:inline">•</span>
                <p className="text-emerald-50/80 text-xs sm:text-sm">
                  Support hours: Mon-Sat, 8 AM - 8 PM EAT
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tips - Mobile Only */}
          <div className="sm:hidden mt-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Quick Tips
              </h4>
              <ul className="text-blue-700 text-xs space-y-1.5">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                  <span>Use specific keywords for better search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                  <span>Browse by category for related questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                  <span>Contact support for personalized help</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Desktop Quick Stats */}
          <div className="hidden sm:block mt-8">
            <div className="flex justify-center gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">15+</div>
                <div className="text-sm text-gray-600">Common Questions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">5</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">&lt;24h</div>
                <div className="text-sm text-gray-600">Response Time</div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="sm:hidden mt-6">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <a href="/" className="hover:text-emerald-600 transition-colors">
                ← Back to Home
              </a>
              <a
                href="/contact"
                className="hover:text-emerald-600 transition-colors"
              >
                Contact Us
              </a>
              <a
                href="/help"
                className="hover:text-emerald-600 transition-colors"
              >
                More Help
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
