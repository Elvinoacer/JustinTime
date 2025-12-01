"use client";
import { use, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useService } from "@/lib/api/hooks/useServices";
import Link from "next/link";

const ServiceDetailsPage = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const [activeTab, setActiveTab] = useState("about");
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileContact, setShowMobileContact] = useState(false);
  const { id: serviceId } = use(params);
  const { data: service, isLoading, error } = useService(serviceId);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <span className="material-symbols-outlined text-gray-400 text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">
            error
          </span>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 text-center">
            Failed to load service
          </h2>
          <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base text-center max-w-md">
            The service you are looking for might have been removed or is
            temporarily unavailable.
          </p>
          <Link
            href="/services"
            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-lg sm:rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm sm:text-base"
          >
            Browse Services
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const provider = service.provider;
  const profile = provider.profile;

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Services", href: "/services" },
    {
      name: service.category.name,
      href: `/services?category=${service.category.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
    },
    { name: service.title, href: `/services/${serviceId}` },
  ];

  // Mobile Navigation Tabs
  const MobileTabs = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
      <div className="grid grid-cols-4 gap-1 p-2">
        {[
          { id: "about", label: "About", icon: "info" },
          { id: "services", label: "Services", icon: "construction" },
          { id: "gallery", label: "Gallery", icon: "photo_library" },
          { id: "reviews", label: "Reviews", icon: "star" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-[0.95] ${
              activeTab === tab.id
                ? "bg-emerald-100 text-emerald-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span className="material-symbols-outlined text-base sm:text-lg">
              {tab.icon}
            </span>
            <span className="mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Mobile Contact Actions
  const MobileContactActions = () => (
    <div className="lg:hidden fixed bottom-16 right-4 z-30">
      <AnimatePresence>
        {showMobileContact ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 min-w-[140px]"
          >
            <div className="space-y-2">
              <Link
                href={`/booking?professional=${provider.id}&service=${service.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
              >
                <span className="material-symbols-outlined text-sm">
                  calendar_month
                </span>
                Book Now
              </Link>
              <Link
                href={`/client/messages?recipient=${provider.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                Message
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        onClick={() => setShowMobileContact(!showMobileContact)}
        className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-lg flex items-center justify-center hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95"
      >
        <span className="material-symbols-outlined">
          {showMobileContact ? "close" : "contact_page"}
        </span>
      </button>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 xs:px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="mb-3 sm:mb-4 md:mb-6">
            <ol className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 overflow-x-auto pb-1">
              {crumbs.map((crumb, index) => (
                <li key={index} className="flex items-center flex-shrink-0">
                  {index > 0 && (
                    <span className="material-symbols-outlined text-xs mx-1 sm:mx-2">
                      chevron_right
                    </span>
                  )}
                  <Link
                    href={crumb.href}
                    className={`hover:text-emerald-600 transition-colors truncate max-w-[80px] sm:max-w-none ${
                      index === crumbs.length - 1
                        ? "text-gray-900 font-medium"
                        : ""
                    }`}
                  >
                    {crumb.name}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          {/* Main Content */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
            {/* Provider Header */}
            <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200">
              <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
                <div className="flex items-start gap-4 w-full md:w-auto">
                  <div className="relative">
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 bg-cover bg-center rounded-xl sm:rounded-2xl border-3 sm:border-4 border-white shadow-md bg-gray-100"
                      style={{
                        backgroundImage: `url(${
                          provider.image || "/placeholder-avatar.png"
                        })`,
                      }}
                    >
                      {!provider.image && (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="material-symbols-outlined text-2xl sm:text-3xl">
                            person
                          </span>
                        </div>
                      )}
                    </div>
                    {profile?.isVerified && (
                      <div className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 md:-bottom-2 md:-right-2 bg-emerald-500 text-white p-0.5 sm:p-1 rounded-full border-2 border-white">
                        <span className="material-symbols-outlined text-xs sm:text-sm">
                          verified
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                      {provider.name}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">
                        work
                      </span>
                      <span className="text-gray-600 text-sm sm:text-base truncate">
                        {service.category.name}
                      </span>
                    </div>
                    {profile?.location && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="material-symbols-outlined text-emerald-600 text-sm">
                          location_on
                        </span>
                        <span className="text-gray-600 text-sm truncate">
                          {profile.location}
                        </span>
                      </div>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`material-symbols-outlined text-sm sm:text-base ${
                              i < Math.floor(provider.rating)
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                          >
                            star
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-600 text-xs sm:text-sm">
                        {provider.rating.toFixed(1)} ({provider.reviewCount}{" "}
                        reviews)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden lg:flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                  <Link
                    href={`/booking?professional=${provider.id}&service=${service.id}`}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span className="material-symbols-outlined">
                      calendar_month
                    </span>
                    Book Now
                  </Link>
                  <Link
                    href={`/client/messages?recipient=${provider.id}`}
                    className="border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span className="material-symbols-outlined">chat</span>
                    Message
                  </Link>
                </div>
              </div>

              {/* Mobile Price Info */}
              <div className="lg:hidden mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Starting from</p>
                    <p className="text-lg font-bold text-gray-900">
                      KES {service.price.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMobileContact(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors"
                  >
                    Contact
                  </button>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="p-4 sm:p-6 md:p-8">
              {/* Desktop Tabs */}
              <div className="hidden lg:flex border-b border-gray-200 mb-6 md:mb-8 overflow-x-auto">
                {[
                  { id: "about", label: "About" },
                  { id: "services", label: "Other Services" },
                  { id: "gallery", label: "Gallery" },
                  { id: "reviews", label: "Reviews" },
                  { id: "contact", label: "Contact" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 md:px-6 py-3 font-medium border-b-2 transition-colors text-sm md:text-base whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-emerald-500 text-emerald-700"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="min-h-[300px] md:min-h-[400px]">
                <AnimatePresence mode="wait">
                  {activeTab === "about" && (
                    <motion.div
                      key="about"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                        About This Service
                      </h2>
                      <p className="text-gray-700 leading-relaxed text-sm sm:text-base mb-4 sm:mb-6">
                        {service.description}
                      </p>

                      {profile?.bio && (
                        <>
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                            About {provider.name}
                          </h3>
                          <p className="text-gray-700 leading-relaxed text-sm sm:text-base mb-4 sm:mb-6">
                            {profile.bio}
                          </p>
                        </>
                      )}

                      {/* Pricing Info - Two Column Grid */}
                      <div className="mt-4 sm:mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                          <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                            payments
                          </span>
                          Pricing Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                            <span className="text-gray-600 text-sm">
                              Service Price
                            </span>
                            <span className="font-bold text-gray-900 text-sm sm:text-base">
                              KES {service.price.toLocaleString()}
                            </span>
                          </div>
                          {profile?.hourlyRate && (
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                              <span className="text-gray-600 text-sm">
                                Hourly Rate
                              </span>
                              <span className="font-bold text-gray-900 text-sm sm:text-base">
                                KES {profile.hourlyRate.toLocaleString()}/hr
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                          <p className="text-xs text-blue-700 mb-1">
                            Response Time
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            &lt; 2 hours
                          </p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <p className="text-xs text-emerald-700 mb-1">
                            Jobs Completed
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            {provider.completedJobs || 0}+
                          </p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <p className="text-xs text-amber-700 mb-1">Rating</p>
                          <p className="font-bold text-gray-900 text-sm">
                            {provider.rating.toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                          <p className="text-xs text-purple-700 mb-1">
                            Member Since
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            {new Date(provider.createdAt).getFullYear()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "services" && (
                    <motion.div
                      key="services"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                          Other Services by {provider.name}
                        </h2>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {service.otherServices.length} total
                        </span>
                      </div>
                      {service.otherServices.length > 0 ? (
                        <div className="grid gap-2 sm:gap-3">
                          {service.otherServices.map((otherService, index) => (
                            <Link
                              href={`/services/${otherService.id}`}
                              key={otherService.id}
                            >
                              <motion.div
                                className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.98]"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                                      check
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-gray-900 font-medium block group-hover:text-emerald-700 transition-colors truncate text-sm sm:text-base">
                                      {otherService.title}
                                    </span>
                                    <span className="text-xs text-gray-500 truncate">
                                      {otherService.category.name}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900">
                                    KES {otherService.price.toLocaleString()}
                                  </span>
                                  <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500 text-sm sm:text-base">
                                    chevron_right
                                  </span>
                                </div>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <span className="material-symbols-outlined text-gray-300 text-4xl mb-3">
                            construction
                          </span>
                          <p className="text-gray-500 text-sm">
                            No other services listed.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "gallery" && (
                    <motion.div
                      key="gallery"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                        Gallery
                      </h2>
                      {service.images.length > 0 || service.video ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                          {service.video && (
                            <div className="aspect-video col-span-2 sm:col-span-3 rounded-lg sm:rounded-xl overflow-hidden bg-black">
                              <video
                                src={service.video}
                                controls
                                className="w-full h-full"
                              />
                            </div>
                          )}
                          {service.images.map((image, index) => (
                            <motion.div
                              key={index}
                              className="aspect-square bg-cover bg-center rounded-lg sm:rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm hover:shadow-md bg-gray-100"
                              style={{ backgroundImage: `url(${image})` }}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.02 }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <span className="material-symbols-outlined text-gray-300 text-4xl mb-3">
                            photo_library
                          </span>
                          <p className="text-gray-500 text-sm">
                            No images available for this service.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "reviews" && (
                    <motion.div
                      key="reviews"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                          Customer Reviews
                        </h2>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-yellow-400 text-sm sm:text-base">
                              star
                            </span>
                            <span className="font-bold text-gray-900 text-sm sm:text-base">
                              {provider.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            ({provider.reviewCount})
                          </span>
                        </div>
                      </div>
                      {provider.receivedReviews.length > 0 ? (
                        <div className="space-y-4 sm:space-y-6">
                          {provider.receivedReviews.map((review, index) => (
                            <motion.div
                              key={review.id}
                              className="border-b border-gray-100 pb-4 sm:pb-6 last:border-b-0"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-10 h-10 sm:w-12 sm:h-12 bg-cover bg-center rounded-full border-2 border-white shadow-sm bg-gray-100 flex-shrink-0"
                                  style={{
                                    backgroundImage: `url(${
                                      review.author.image ||
                                      "/placeholder-avatar.png"
                                    })`,
                                  }}
                                >
                                  {!review.author.image && (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <span className="material-symbols-outlined text-base">
                                        person
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
                                    <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                      {review.author.name || "Anonymous"}
                                    </h4>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                      {new Date(
                                        review.createdAt
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                      <span
                                        key={i}
                                        className={`material-symbols-outlined text-xs sm:text-sm ${
                                          i < review.rating
                                            ? "text-amber-400"
                                            : "text-gray-200"
                                        }`}
                                      >
                                        star
                                      </span>
                                    ))}
                                  </div>
                                  {review.comment && (
                                    <p className="text-gray-600 mt-2 leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none text-sm">
                                      {review.comment}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <span className="material-symbols-outlined text-gray-300 text-4xl mb-3">
                            rate_review
                          </span>
                          <p className="text-gray-500 text-sm mb-2">
                            No reviews yet.
                          </p>
                          <p className="text-gray-400 text-xs">
                            Be the first to review this service!
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "contact" && (
                    <motion.div
                      key="contact"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                        Contact Information
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {provider.phone && (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors">
                            <div className="bg-white p-2 rounded-full shadow-sm">
                              <span className="material-symbols-outlined text-emerald-600 text-sm">
                                call
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-sm">
                                Phone
                              </p>
                              <p className="text-gray-600 text-sm">
                                {provider.phone}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors">
                          <div className="bg-white p-2 rounded-full shadow-sm">
                            <span className="material-symbols-outlined text-emerald-600 text-sm">
                              mail
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-sm">
                              Email
                            </p>
                            <p className="text-gray-600 text-sm truncate">
                              {provider.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors sm:col-span-2">
                          <div className="bg-white p-2 rounded-full shadow-sm">
                            <span className="material-symbols-outlined text-emerald-600 text-sm">
                              schedule
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-sm">
                              Availability
                            </p>
                            <p className="text-gray-600 text-sm">
                              Usually responds within 2 hours
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Navigation Tabs */}
      <MobileTabs />

      {/* Mobile Contact Actions */}
      <MobileContactActions />

      <Footer />
    </div>
  );
};

export default ServiceDetailsPage;
