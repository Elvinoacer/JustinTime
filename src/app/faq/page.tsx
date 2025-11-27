'use client';

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";
import { ChevronDown, Search, HelpCircle, CreditCard, Shield, Users, Settings, Phone } from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: "Getting Started",
    question: "How do I create an account?",
    answer: "Creating an account is simple! Click the 'Sign Up' button in the top right corner, choose whether you're a client looking for services or a professional offering services, and fill in your basic information. You'll receive a verification email to activate your account."
  },
  {
    category: "Getting Started",
    question: "How do I post a job?",
    answer: "To post a job, sign up as a client, go to your dashboard, and click on 'Post a Job'. Describe your needs, set your budget, add photos if relevant, and specify your preferred timeline. Service providers will then submit proposals for your review."
  },
  {
    category: "Getting Started",
    question: "How do I find service providers?",
    answer: "You can browse service providers by category on our homepage, use the search function to find specific skills, or post a job and let professionals come to you. Each provider has ratings, reviews, and a detailed profile to help you make an informed decision."
  },
  {
    category: "Payments & Pricing",
    question: "Is it free to join?",
    answer: "Yes, joining JustInTime is completely free for both clients and service providers. We charge a small service fee (10%) only on successful bookings to maintain our platform and provide customer support."
  },
  {
    category: "Payments & Pricing",
    question: "How do I pay for services?",
    answer: "You can pay securely through our platform using M-Pesa, credit/debit cards, or bank transfer. Payments are held in escrow until the job is completed to your satisfaction, ensuring both parties are protected."
  },
  {
    category: "Payments & Pricing",
    question: "When do service providers get paid?",
    answer: "Service providers receive payment within 24-48 hours after you confirm the job is completed satisfactorily. This ensures quality work and gives you time to review the service before funds are released."
  },
  {
    category: "Payments & Pricing",
    question: "What are the fees?",
    answer: "Clients pay the agreed service amount plus a 10% platform fee. Service providers pay a 10% commission on their earnings. There are no hidden charges or subscription fees."
  },
  {
    category: "Safety & Trust",
    question: "Are the service providers verified?",
    answer: "Yes, we verify the identity and credentials of our service providers through ID verification, skill assessments, and background checks where applicable. We also maintain a rating and review system to ensure ongoing quality."
  },
  {
    category: "Safety & Trust",
    question: "What if I'm not satisfied with the service?",
    answer: "We have a dispute resolution process. If you're not satisfied, contact our support team within 48 hours of service completion. We'll mediate between you and the provider, and in cases of legitimate complaints, we can arrange refunds or re-work."
  },
  {
    category: "Safety & Trust",
    question: "How do you protect my personal information?",
    answer: "We use industry-standard encryption to protect your data. Your payment information is never stored on our servers, and we never share your personal details without your explicit consent. Read our Privacy Policy for more details."
  },
  {
    category: "Services",
    question: "What types of services are available?",
    answer: "We offer a wide range of services including plumbing, electrical work, cleaning, carpentry, painting, gardening, beauty services, tutoring, and much more. Browse our categories to see all available services."
  },
  {
    category: "Services",
    question: "Can I schedule recurring services?",
    answer: "Absolutely! Many of our service providers offer recurring bookings for regular services like cleaning, gardening, or maintenance. You can set up weekly, bi-weekly, or monthly schedules at discounted rates."
  },
  {
    category: "Services",
    question: "How far in advance should I book?",
    answer: "It depends on the service and demand. For standard services, 24-48 hours is usually sufficient. For specialized services or peak times (weekends, holidays), we recommend booking at least a week in advance."
  },
  {
    category: "Support",
    question: "How can I contact customer support?",
    answer: "You can reach our support team via the in-app chat, email at support@justintime.co.ke, or call us at +254 790 670 542. Our support hours are Monday-Saturday, 8 AM - 8 PM EAT."
  },
  {
    category: "Support",
    question: "Can I cancel or reschedule a booking?",
    answer: "Yes, you can cancel or reschedule up to 24 hours before the scheduled time without penalty. Cancellations within 24 hours may incur a 20% cancellation fee to compensate the service provider for their time."
  }
];

const categories = ["All", "Getting Started", "Payments & Pricing", "Safety & Trust", "Services", "Support"];

const categoryIcons: Record<string, any> = {
  "Getting Started": HelpCircle,
  "Payments & Pricing": CreditCard,
  "Safety & Trust": Shield,
  "Services": Settings,
  "Support": Phone,
  "All": Users
};

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 pt-24">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl mb-6 shadow-lg shadow-emerald-500/30">
              <HelpCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-emerald-900 to-gray-900 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions about JustInTime. Can't find what you're looking for? Contact our support team.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all transform hover:scale-105 ${
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

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No FAQs found matching your search.</p>
                <p className="text-gray-500 text-sm mt-2">Try different keywords or browse all categories.</p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isOpen = openIndex === index;
                const Icon = categoryIcons[faq.category];
                
                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-lg hover:border-emerald-200 group"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full px-6 py-5 flex items-start gap-4 text-left transition-colors group-hover:bg-gray-50"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center group-hover:from-emerald-100 group-hover:to-emerald-200 transition-colors">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-xs font-semibold text-emerald-600 mb-1 block">
                              {faq.category}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                              {faq.question}
                            </h3>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
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
                      <div className="px-6 pb-5 pl-20">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Contact Support CTA */}
          <div className="mt-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-8 md:p-10 text-center shadow-xl shadow-emerald-500/20">
            <Phone className="w-12 h-12 text-white/90 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Still have questions?
            </h2>
            <p className="text-emerald-50 mb-6 max-w-2xl mx-auto">
              Our support team is here to help. Reach out via chat, email, or phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Contact Support
              </a>
              <a
                href="tel:+254790670542"
                className="inline-flex items-center justify-center px-6 py-3 bg-emerald-700 text-white font-semibold rounded-xl hover:bg-emerald-800 transition-colors"
              >
                Call +254 790 670 542
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
