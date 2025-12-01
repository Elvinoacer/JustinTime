"use client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Cookie, Shield, Settings, Eye, Lock } from "lucide-react";
import { Mail } from "lucide-react";

export default function CookiePolicyPage() {
  const sections = [
    {
      icon: Cookie,
      title: "What are Cookies?",
      content:
        "Cookies are small text files that are sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.",
    },
    {
      icon: Settings,
      title: "How JustInTime Uses Cookies",
      content:
        "We use cookies to enhance your experience on our platform, remember your preferences, analyze website traffic, and provide personalized content. Cookies help us understand how you interact with our services so we can improve functionality and user experience.",
    },
    {
      icon: Eye,
      title: "Essential Cookies",
      content:
        "These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas. The website cannot function properly without these cookies. They are usually only set in response to actions made by you such as logging in or filling in forms.",
    },
    {
      icon: Shield,
      title: "Analytics & Performance Cookies",
      content:
        "These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular and see how visitors move around the site. All information these cookies collect is aggregated and therefore anonymous.",
    },
    {
      icon: Lock,
      title: "Your Cookie Choices",
      content:
        "You have the right to decide whether to accept or reject cookies. You can exercise your cookie preferences by clicking on the appropriate opt-out links provided in our cookie banner. You can also set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies.",
    },
  ];

  const cookieTypes = [
    {
      name: "Essential Cookies",
      description: "Required for basic website functionality",
      examples: ["Session management", "Security features", "Load balancing"],
      duration: "Session",
      mandatory: true,
    },
    {
      name: "Preference Cookies",
      description: "Remember your settings and preferences",
      examples: ["Language selection", "Theme preferences", "Region settings"],
      duration: "1 year",
      mandatory: false,
    },
    {
      name: "Analytics Cookies",
      description: "Help us understand how you use our site",
      examples: ["Page visits", "Time on site", "Error tracking"],
      duration: "2 years",
      mandatory: false,
    },
    {
      name: "Marketing Cookies",
      description: "Track effectiveness of advertising campaigns",
      examples: ["Ad performance", "User interests", "Conversion tracking"],
      duration: "1 year",
      mandatory: false,
    },
  ];

  const faqs = [
    {
      question: "How can I manage cookies?",
      answer:
        "You can manage cookies through your browser settings. Most browsers allow you to refuse cookies or delete them. You can also use our cookie banner to manage your preferences.",
    },
    {
      question: "Do cookies store personal information?",
      answer:
        "Cookies themselves do not store personal information like your name or address. They may store technical information that can indirectly identify you along with other information.",
    },
    {
      question: "What happens if I disable cookies?",
      answer:
        "Disabling cookies may prevent some parts of our website from functioning properly. Essential features may still work, but your experience may be limited.",
    },
    {
      question: "How often is this policy updated?",
      answer:
        "We review and update this policy regularly. The 'Last updated' date at the top of this page indicates when the policy was last revised.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <Header />

      <main className="flex-1 px-3 sm:px-4 py-8 sm:py-12 pt-20 sm:pt-24">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
              <Cookie className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Cookie Policy
            </h1>
            <p className="text-gray-600 text-sm sm:text-base max-w-3xl mx-auto">
              Learn how we use cookies to enhance your experience on JustInTime
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Introduction */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 md:p-8">
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  This Cookie Policy explains what cookies are and how we use
                  them on the JustInTime platform. By using our website, you
                  consent to the use of cookies in accordance with this policy.
                </p>
              </div>

              {/* Sections */}
              <div className="space-y-4 sm:space-y-6">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 md:p-8"
                    >
                      <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                        </div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 pt-1">
                          {section.title}
                        </h2>
                      </div>
                      <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Cookie Types Table */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 md:p-8">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Types of Cookies We Use
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 text-left text-xs sm:text-sm font-semibold text-gray-700">
                          Cookie Type
                        </th>
                        <th className="py-3 px-4 text-left text-xs sm:text-sm font-semibold text-gray-700">
                          Purpose
                        </th>
                        <th className="py-3 px-4 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">
                          Examples
                        </th>
                        <th className="py-3 px-4 text-left text-xs sm:text-sm font-semibold text-gray-700">
                          Duration
                        </th>
                        <th className="py-3 px-4 text-left text-xs sm:text-sm font-semibold text-gray-700">
                          Mandatory
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cookieTypes.map((cookie, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900 text-xs sm:text-sm">
                              {cookie.name}
                            </div>
                            <div className="text-gray-500 text-xs mt-0.5">
                              {cookie.description}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs sm:text-sm text-gray-600">
                            <ul className="list-disc list-inside space-y-1">
                              {cookie.examples.slice(0, 2).map((example, i) => (
                                <li key={i} className="text-xs sm:text-sm">
                                  {example}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-xs sm:text-sm hidden sm:table-cell">
                            {cookie.examples.join(", ")}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {cookie.duration}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                cookie.mandatory
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {cookie.mandatory ? "Required" : "Optional"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 md:p-8">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg sm:rounded-xl p-4"
                    >
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Links */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-3 sm:mb-4">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Terms of Service", href: "/terms" },
                    { label: "Data Processing", href: "/data-processing" },
                    { label: "Cookie Settings", href: "#", action: true },
                  ].map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      onClick={
                        link.action
                          ? (e) => {
                              e.preventDefault();
                              // Implement cookie settings modal
                              console.log("Open cookie settings");
                            }
                          : undefined
                      }
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <span className="text-gray-700 text-sm sm:text-base group-hover:text-emerald-600">
                        {link.label}
                      </span>
                      <span className="text-gray-400 group-hover:text-emerald-500">
                        →
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Cookie Control */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-100 p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                    Cookie Control
                  </h3>
                </div>
                <p className="text-gray-600 text-sm sm:text-base mb-4">
                  Manage your cookie preferences and control how we use cookies
                  on your device.
                </p>
                <div className="space-y-3">
                  <button className="w-full bg-white border border-blue-200 text-blue-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base">
                    Essential Cookies Only
                  </button>
                  <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors text-sm sm:text-base">
                    Accept All Cookies
                  </button>
                  <button className="w-full text-gray-600 font-medium py-2.5 px-4 rounded-lg hover:text-gray-900 transition-colors text-sm sm:text-base">
                    Customize Preferences
                  </button>
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6">
                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-3 sm:mb-4">
                  Need Help?
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">
                  Have questions about our cookie policy or data practices?
                </p>
                <div className="space-y-2">
                  <a
                    href="mailto:privacy@justintime.co.ke"
                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm sm:text-base"
                  >
                    <Mail className="w-4 h-4" />
                    privacy@justintime.co.ke
                  </a>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    We typically respond within 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="lg:hidden mt-8">
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Need to manage cookies?
                </div>
                <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors">
                  Cookie Settings
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Summary */}
          <div className="hidden lg:block mt-8">
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    Summary of Your Rights
                  </h3>
                  <p className="text-gray-600 text-sm">
                    You have the right to access, correct, delete, and restrict
                    processing of your personal data. You can manage cookies
                    through your browser settings or our cookie consent tool.
                  </p>
                </div>
                <button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
                  Update Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
