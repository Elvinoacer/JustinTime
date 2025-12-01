import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  CheckCircle,
  Star,
  Clock,
  Shield,
} from "lucide-react";

export default function ClientOnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 pt-6 sm:pt-8 lg:pt-12 pb-8 sm:pb-12 lg:pb-16">
        <div className="text-center">
          {/* Logo/Brand */}
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold">
              <span className="material-symbols-outlined text-base">
                handyman
              </span>
              JustInTime Services
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight px-2">
            Find the Perfect
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-1">
              Professional for Any Job
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-3 sm:mt-4 max-w-md sm:max-w-lg md:max-w-xl mx-auto text-xs xs:text-sm sm:text-base lg:text-lg text-gray-600 px-3">
            Get your to-do list done. Hire trusted professionals for any job,
            big or small.
          </p>

          {/* CTA Buttons - Mobile: Stacked, Desktop: Inline */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link
              href="/client/post-job"
              className="inline-flex items-center justify-center px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-sm sm:text-base rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              <span className="mr-2">Post a Job</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center px-5 sm:px-6 py-3 sm:py-3.5 bg-white border-2 border-blue-200 hover:border-blue-300 text-blue-600 hover:text-blue-700 font-semibold text-sm sm:text-base rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <Search className="w-4 h-4 mr-2" />
              Explore Services
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto px-4">
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                5,000+
              </div>
              <div className="text-[10px] xs:text-xs text-gray-500 mt-0.5">
                Verified Pros
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                98%
              </div>
              <div className="text-[10px] xs:text-xs text-gray-500 mt-0.5">
                Satisfaction Rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                24/7
              </div>
              <div className="text-[10px] xs:text-xs text-gray-500 mt-0.5">
                Support
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                50K+
              </div>
              <div className="text-[10px] xs:text-xs text-gray-500 mt-0.5">
                Jobs Completed
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section - Mobile: Stacked, Desktop: Grid */}
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
            How It Works
          </h2>
          <p className="text-xs xs:text-sm sm:text-base text-gray-600 max-w-md mx-auto">
            Get your job done in 3 simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md border border-gray-100 transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl mb-4">
                1
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                Post Your Job
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Describe what you need help with and set your budget
              </p>
              <div className="mt-2 text-blue-600">
                <span className="material-symbols-outlined text-2xl">
                  description
                </span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md border border-gray-100 transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl mb-4">
                2
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                Review Quotes
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Receive quotes from interested professionals in minutes
              </p>
              <div className="mt-2 text-purple-600">
                <span className="material-symbols-outlined text-2xl">
                  receipt_long
                </span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md border border-gray-100 transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl mb-4">
                3
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                Hire & Get It Done
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Choose the best pro and get your job completed
              </p>
              <div className="mt-2 text-emerald-600">
                <span className="material-symbols-outlined text-2xl">
                  handshake
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Services Grid - Mobile: 2 columns, Desktop: 4 columns */}
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-8 sm:py-12 lg:py-16 bg-gradient-to-b from-gray-50/50 to-transparent">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
            Popular Services
          </h2>
          <p className="text-xs xs:text-sm sm:text-base text-gray-600 max-w-md mx-auto">
            Browse our most requested professional services
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              name: "Home Cleaning",
              icon: "cleaning_services",
              color: "from-blue-500 to-blue-600",
            },
            {
              name: "Plumbing",
              icon: "plumbing",
              color: "from-emerald-500 to-emerald-600",
            },
            {
              name: "Electrical",
              icon: "electrical_services",
              color: "from-amber-500 to-amber-600",
            },
            {
              name: "Moving Help",
              icon: "local_shipping",
              color: "from-purple-500 to-purple-600",
            },
            {
              name: "Painting",
              icon: "format_paint",
              color: "from-pink-500 to-pink-600",
            },
            {
              name: "Gardening",
              icon: "yard",
              color: "from-green-500 to-green-600",
            },
            {
              name: "Carpentry",
              icon: "carpenter",
              color: "from-orange-500 to-orange-600",
            },
            {
              name: "AC Repair",
              icon: "ac_unit",
              color: "from-cyan-500 to-cyan-600",
            },
          ].map((service, index) => (
            <Link
              key={service.name}
              href={`/services/${service.name.toLowerCase().replace(" ", "-")}`}
              className="group bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md border border-gray-100 transition-all hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <span className="material-symbols-outlined text-white text-lg sm:text-xl">
                    {service.icon}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {service.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 sm:mt-10">
          <Link
            href="/services"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm sm:text-base group"
          >
            View All Services
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Why Choose Us - Mobile: Stacked, Desktop: 2 columns */}
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              Why Choose JustInTime
            </h2>
            <p className="text-xs xs:text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
              We connect you with trusted professionals who deliver quality work
              on time, every time.
            </p>

            <div className="space-y-4 sm:space-y-6">
              {[
                {
                  icon: "shield",
                  title: "Verified Professionals",
                  description: "All pros are background-checked and verified",
                },
                {
                  icon: "payments",
                  title: "Secure Payments",
                  description: "Pay securely with payment protection",
                },
                {
                  icon: "stars",
                  title: "Quality Guaranteed",
                  description: "Satisfaction guarantee on all work",
                },
                {
                  icon: "support_agent",
                  title: "24/7 Support",
                  description: "Our team is always here to help",
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 sm:gap-4"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-600 text-lg sm:text-xl">
                      {feature.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Testimonials */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
              What Our Customers Say
            </h3>

            <div className="space-y-4 sm:space-y-6">
              {[
                {
                  name: "Sarah Johnson",
                  role: "Homeowner",
                  text: "Found a plumber in 30 minutes who fixed my leak same day! Amazing service.",
                  rating: 5,
                },
                {
                  name: "Michael Chen",
                  role: "Small Business Owner",
                  text: "Used JustInTime for office cleaning. Professional, reliable, and affordable.",
                  rating: 5,
                },
                {
                  name: "Emily Rodriguez",
                  role: "Busy Parent",
                  text: "Hired a painter through the app. Quality work and excellent communication.",
                  rating: 4,
                },
              ].map((testimonial, index) => (
                <div
                  key={testimonial.name}
                  className="bg-white rounded-lg sm:rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-900">
                        {testimonial.name}
                      </h5>
                      <p className="text-xs text-gray-500">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-amber-500 text-sm"
                      >
                        {i < testimonial.rating ? "star" : "star_border"}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 italic">
                    "{testimonial.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 text-center">
          <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xs xs:text-sm sm:text-base text-blue-100 mb-6 sm:mb-8 max-w-lg mx-auto">
            Join thousands of satisfied customers who get things done with
            JustInTime
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/client/post-job"
              className="inline-flex items-center justify-center px-5 sm:px-6 py-3 sm:py-3.5 bg-white text-blue-600 hover:text-blue-700 font-bold text-sm sm:text-base rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Post Your First Job
            </Link>
            <Link
              href="/client/signup"
              className="inline-flex items-center justify-center px-5 sm:px-6 py-3 sm:py-3.5 bg-transparent border-2 border-white/30 hover:border-white/50 text-white font-semibold text-sm sm:text-base rounded-lg sm:rounded-xl backdrop-blur-sm transition-all"
            >
              Create Free Account
            </Link>
          </div>

          {/* Mobile Download Links */}
          <div className="mt-8 sm:hidden">
            <p className="text-xs text-blue-200 mb-3">Get the app</p>
            <div className="flex justify-center gap-3">
              <button className="px-4 py-2 bg-black/20 hover:bg-black/30 text-white rounded-lg text-xs font-medium backdrop-blur-sm">
                App Store
              </button>
              <button className="px-4 py-2 bg-black/20 hover:bg-black/30 text-white rounded-lg text-xs font-medium backdrop-blur-sm">
                Google Play
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
