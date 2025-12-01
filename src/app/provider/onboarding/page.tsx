"use client";
import { motion } from "framer-motion";
import Link from "next/link";
export default function ProviderOnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Header Section */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl sm:rounded-3xl shadow-lg shadow-blue-500/30 mb-4 sm:mb-6"
          >
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </motion.div>

          <h1 className="text-2xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 tracking-tight px-2">
            Welcome to JustInTime
          </h1>
          <p className="mt-3 sm:mt-4 md:mt-5 max-w-xl mx-auto text-base sm:text-lg md:text-xl text-gray-600 px-3">
            Start your journey as a service provider. Reach more clients, manage
            your bookings, and grow your business.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col xs:flex-row justify-center gap-3 sm:gap-4 px-3">
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center justify-center px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Complete Your Profile
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 border border-blue-200 text-sm sm:text-base font-medium rounded-lg sm:rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors active:scale-[0.98]"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              Go to Dashboard
            </Link>
          </div>
        </div>

        {/* Features Grid - Two Column on Mobile, Three on Desktop */}
        <div className="mt-12 sm:mt-16 md:mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Feature 1 - Reach New Clients */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group"
            >
              <div className="h-full bg-white rounded-xl sm:rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Reach New Clients
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    Showcase your skills and portfolio to thousands of potential
                    clients looking for your services.
                  </p>
                </div>
                <div className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8">
                  <Link
                    href="/dashboard/profile"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base group-hover:translate-x-1 transition-transform"
                  >
                    Set up your profile
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Feature 2 - Manage Bookings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group"
            >
              <div className="h-full bg-white rounded-xl sm:rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Manage Bookings
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    Keep track of your schedule, accept or reject bookings, and
                    manage your availability effortlessly.
                  </p>
                </div>
                <div className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8">
                  <Link
                    href="/dashboard/calendar"
                    className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium text-sm sm:text-base group-hover:translate-x-1 transition-transform"
                  >
                    View calendar
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Feature 3 - Secure Payments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="group"
            >
              <div className="h-full bg-white rounded-xl sm:rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Secure Payments
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    Get paid securely and on time. Track your earnings and
                    manage payouts directly from your dashboard.
                  </p>
                </div>
                <div className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 md:pb-8">
                  <Link
                    href="/dashboard/payments"
                    className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm sm:text-base group-hover:translate-x-1 transition-transform"
                  >
                    Set up payments
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="mt-12 sm:mt-16 md:mt-20 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border border-blue-100">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
              Why Join JustInTime?
            </h2>
            <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              Join thousands of professionals who are growing their business
              with us
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-blue-100">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">
                10,000+
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Active Clients
              </div>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-emerald-100">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600 mb-1 sm:mb-2">
                98%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Satisfaction Rate
              </div>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-purple-100">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-600 mb-1 sm:mb-2">
                24/7
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Support Available
              </div>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-amber-100">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-600 mb-1 sm:mb-2">
                KES 50M+
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Paid to Providers
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 sm:mt-16 md:mt-20 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-6 sm:mb-8">
            Complete your profile in just 5 minutes and start receiving booking
            requests today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-1 active:scale-[0.98] text-sm sm:text-base"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Complete Profile Now
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors active:scale-[0.98] text-sm sm:text-base"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Need Help?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
