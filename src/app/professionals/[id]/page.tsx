"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useProfessional } from "@/lib/api/hooks/useProfessional";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ProfessionalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, error } = useProfessional(id);
  const professional = data?.data;

  const [activeTab, setActiveTab] = useState<"about" | "services" | "reviews">(
    "about"
  );
  const [showMobileContact, setShowMobileContact] = useState(false);

  // Handler for booking
  const handleBookNow = () => {
    router.push(`/booking?professional=${id}`);
  };

  // Handler for WhatsApp message
  const handleSendMessage = () => {
    if (!professional?.phone) {
      toast.error("Phone number not available");
      return;
    }
    const formattedPhone = professional.phone.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(
      `Hi ${professional.name}, I found your profile on JustInTime and would like to discuss your services.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };

  // Handler for sharing profile
  const handleShareProfile = () => {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success("Profile link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  if (error || !professional) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-gray-300 text-5xl sm:text-6xl md:text-8xl mb-4 sm:mb-6">
              person_off
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Professional Not Found
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
              This professional may no longer be available.
            </p>
            <Link
              href="/professionals"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm sm:text-base"
            >
              Browse All Professionals
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const tabs = [
    { id: "about", label: "About", icon: "person" },
    { id: "services", label: "Services", icon: "work" },
    { id: "reviews", label: "Reviews", icon: "star" },
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative bg-white pb-8 sm:pb-12">
          {/* Cover Background */}
          <div className="h-32 sm:h-40 md:h-48 lg:h-64 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 lg:gap-8">
              {/* Profile Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative -mt-16 sm:-mt-20 md:-mt-24 lg:-mt-32 shrink-0"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-40 md:h-40 lg:w-52 lg:h-52 rounded-xl sm:rounded-2xl md:rounded-3xl border-3 sm:border-4 border-white shadow-xl md:shadow-2xl overflow-hidden bg-white relative z-10">
                  {professional.image ? (
                    <img
                      src={professional.image}
                      alt={professional.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl sm:text-4xl md:text-6xl font-bold">
                      {professional.name.charAt(0)}
                    </div>
                  )}
                </div>
                {professional.isVerified && (
                  <div
                    className="absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 md:bottom-2 md:-right-2 z-20 bg-blue-500 text-white p-1 sm:p-1.5 md:p-2 rounded-full border-2 sm:border-3 md:border-4 border-white shadow-md md:shadow-lg"
                    title="Verified Professional"
                  >
                    <span className="material-symbols-outlined text-xs sm:text-sm md:text-lg lg:text-xl">
                      verified
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Profile Info */}
              <div className="flex-1 w-full md:w-auto text-center md:text-left pt-2 md:pt-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4">
                  <div className="flex-1">
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2"
                    >
                      {professional.name}
                    </motion.h1>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm md:text-base text-gray-700"
                    >
                      {professional.location && (
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <span className="material-symbols-outlined text-emerald-600 text-xs sm:text-sm">
                            location_on
                          </span>
                          <span className="truncate max-w-[120px] sm:max-w-none">
                            {professional.location}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        <span className="material-symbols-outlined text-emerald-600 text-xs sm:text-sm">
                          schedule
                        </span>
                        <span className="whitespace-nowrap">
                          Since{" "}
                          {new Date(professional.memberSince).getFullYear()}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <span className="material-symbols-outlined text-amber-400 fill-current text-xs sm:text-sm">
                          star
                        </span>
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">
                          {professional.averageRating.toFixed(1)}
                        </span>
                        <span className="text-gray-500 text-xs sm:text-sm">
                          ({professional.totalReviews})
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Desktop Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="hidden md:flex items-center justify-center md:justify-start gap-2 lg:gap-3"
                  >
                    <button
                      onClick={handleShareProfile}
                      className="p-2 sm:p-3 rounded-lg md:rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      title="Share Profile"
                    >
                      <span className="material-symbols-outlined text-sm md:text-base">
                        share
                      </span>
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl border border-emerald-600 text-emerald-600 font-semibold hover:bg-emerald-50 transition-colors flex items-center gap-1.5 sm:gap-2 text-sm md:text-base whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-sm md:text-base">
                        chat
                      </span>
                      <span className="hidden sm:inline">Message</span>
                    </button>
                    <button
                      onClick={handleBookNow}
                      className="px-5 py-2.5 sm:px-6 sm:py-3 md:px-8 md:py-3 rounded-lg md:rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md md:shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-1.5 sm:gap-2 text-sm md:text-base whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-sm md:text-base">
                        event_available
                      </span>
                      <span className="hidden sm:inline">Book Now</span>
                    </button>
                  </motion.div>
                </div>

                {/* Mobile Contact Bar */}
                <div className="md:hidden mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setShowMobileContact(!showMobileContact)}
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">
                        contact_phone
                      </span>
                      Contact
                    </button>
                    <button
                      onClick={handleShareProfile}
                      className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                      title="Share Profile"
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {showMobileContact && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 overflow-hidden"
                      >
                        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg">
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={handleSendMessage}
                              className="px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg font-semibold flex items-center justify-center gap-2 border border-emerald-100"
                            >
                              <span className="material-symbols-outlined">
                                chat
                              </span>
                              WhatsApp
                            </button>
                            <button
                              onClick={handleBookNow}
                              className="px-4 py-3 bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined">
                                event_available
                              </span>
                              Book Now
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-6 sm:py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8">
              {/* Tabs */}
              <div className="border-b border-gray-200 overflow-x-auto">
                <div className="flex gap-4 sm:gap-6 md:gap-8 min-w-max">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-3 font-medium text-sm sm:text-base transition-all relative whitespace-nowrap ${
                        activeTab === tab.id
                          ? "text-emerald-600"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="material-symbols-outlined text-sm sm:text-base">
                          {tab.icon}
                        </span>
                        {tab.label}
                      </div>
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-[300px] sm:min-h-[400px]">
                <AnimatePresence mode="wait">
                  {activeTab === "about" && (
                    <motion.div
                      key="about"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 sm:space-y-6 md:space-y-8"
                    >
                      {/* Bio */}
                      <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                          About Me
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-sm sm:text-base md:text-lg">
                          {professional.bio || "No bio available."}
                        </p>
                      </div>

                      {/* Skills */}
                      {professional.skills.length > 0 && (
                        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                            Skills & Expertise
                          </h3>
                          <div className="flex flex-wrap gap-2 sm:gap-3">
                            {professional.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 text-gray-700 rounded-lg sm:rounded-xl font-medium border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all cursor-default text-xs sm:text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education & Certifications Grid */}
                      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                        {professional.education.length > 0 && (
                          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                                school
                              </span>
                              Education
                            </h3>
                            <div className="space-y-4 sm:space-y-6">
                              {professional.education.map(
                                (edu: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="relative pl-4 sm:pl-6 border-l-2 border-gray-100 last:border-0"
                                  >
                                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-200 border-2 border-white ring-1 ring-emerald-100" />
                                    <div className="font-bold text-gray-900 text-sm sm:text-base">
                                      {edu.degree}
                                    </div>
                                    <div className="text-emerald-600 font-medium text-xs sm:text-sm mb-1">
                                      {edu.field}
                                    </div>
                                    <div className="text-gray-500 text-xs sm:text-sm">
                                      {edu.institution}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {edu.startYear} -{" "}
                                      {edu.endYear || "Present"}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {professional.certifications.length > 0 && (
                          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
                                workspace_premium
                              </span>
                              Certifications
                            </h3>
                            <div className="space-y-3 sm:space-y-4">
                              {professional.certifications.map(
                                (cert: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl hover:bg-emerald-50/50 transition-colors group"
                                  >
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow-sm text-emerald-600">
                                      <span className="material-symbols-outlined text-sm sm:text-base">
                                        verified
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-emerald-700 transition-colors truncate">
                                        {cert.name}
                                      </div>
                                      <div className="text-gray-500 text-xs sm:text-sm truncate">
                                        {cert.issuer}
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {cert.date}
                                      </div>
                                    </div>
                                    {cert.fileUrl && (
                                      <a
                                        href={cert.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 sm:p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all flex-shrink-0"
                                        title="View Certificate"
                                      >
                                        <span className="material-symbols-outlined text-sm sm:text-base">
                                          visibility
                                        </span>
                                      </a>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "services" && (
                    <motion.div
                      key="services"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {professional.services.length === 0 ? (
                        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-6 sm:p-8 md:p-12 text-center border border-gray-100 border-dashed">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <span className="material-symbols-outlined text-gray-300 text-xl sm:text-2xl md:text-3xl">
                              construction
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg md:text-lg font-medium text-gray-900 mb-1">
                            No services listed
                          </h3>
                          <p className="text-gray-500 text-sm sm:text-base">
                            This professional hasn't added any services yet.
                          </p>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                          {professional.services.map((service) => (
                            <div
                              key={service.id}
                              className="group bg-white rounded-lg sm:rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                              {/* Service Image */}
                              <div className="h-32 sm:h-40 md:h-48 bg-gray-100 relative overflow-hidden">
                                {service.images && service.images.length > 0 ? (
                                  <img
                                    src={service.images[0]}
                                    alt={service.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                    <span className="material-symbols-outlined text-gray-300 text-3xl sm:text-4xl md:text-5xl">
                                      construction
                                    </span>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2">
                                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold rounded-full shadow-sm">
                                    {service.pricingUnit === "hourly"
                                      ? "Hourly"
                                      : "Fixed"}
                                  </span>
                                </div>
                              </div>

                              <div className="p-3 sm:p-4 md:p-6">
                                <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                  {service.title}
                                </h4>
                                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-3 sm:mb-4 h-8 sm:h-10">
                                  {service.description}
                                </p>

                                <div className="flex items-end justify-between pt-3 sm:pt-4 border-t border-gray-50">
                                  <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">
                                      Price
                                    </p>
                                    <div className="flex items-baseline gap-0.5">
                                      <span className="text-lg sm:text-xl font-bold text-gray-900">
                                        KES {service.price.toLocaleString()}
                                      </span>
                                      {service.pricingUnit === "hourly" && (
                                        <span className="text-xs sm:text-sm text-gray-500 font-medium">
                                          /hr
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/booking?professional=${id}&service=${service.id}`
                                      )
                                    }
                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                                    title="Book this service"
                                  >
                                    <span className="material-symbols-outlined text-sm sm:text-base">
                                      arrow_forward
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
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
                      transition={{ duration: 0.2 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      {professional.reviews.length === 0 ? (
                        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-6 sm:p-8 md:p-12 text-center border border-gray-100 border-dashed">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <span className="material-symbols-outlined text-gray-300 text-xl sm:text-2xl md:text-3xl">
                              rate_review
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg md:text-lg font-medium text-gray-900 mb-1">
                            No reviews yet
                          </h3>
                          <p className="text-gray-500 text-sm sm:text-base">
                            Be the first to review this professional.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:gap-4">
                          {professional.reviews.map((review) => (
                            <div
                              key={review.id}
                              className="p-4 sm:p-6 bg-white rounded-lg sm:rounded-xl border border-gray-100 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start gap-3 sm:gap-4">
                                {review.reviewer.image ? (
                                  <img
                                    src={review.reviewer.image}
                                    alt={review.reviewer.name || "User"}
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-gray-100"
                                  />
                                ) : (
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-base sm:text-lg ring-2 ring-gray-100">
                                    {(review.reviewer.name || "U").charAt(0)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1 sm:gap-2">
                                    <div className="min-w-0">
                                      <div className="font-bold text-gray-900 text-sm sm:text-base truncate">
                                        {review.reviewer.name || "Anonymous"}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(
                                          review.createdAt
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg self-start sm:self-auto">
                                      {[...Array(5)].map((_, i) => (
                                        <span
                                          key={i}
                                          className="material-symbols-outlined text-xs sm:text-sm"
                                          style={{
                                            color:
                                              i < review.rating
                                                ? "#F59E0B"
                                                : "#E5E7EB",
                                            fontVariationSettings: "'FILL' 1",
                                          }}
                                        >
                                          star
                                        </span>
                                      ))}
                                      <span className="ml-1 text-xs sm:text-sm font-bold text-amber-700">
                                        {review.rating}.0
                                      </span>
                                    </div>
                                  </div>
                                  {review.comment && (
                                    <p className="text-gray-600 leading-relaxed text-sm sm:text-base bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl rounded-tl-none">
                                      "{review.comment}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">
                  Performance Metrics
                </h3>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <span className="material-symbols-outlined text-sm sm:text-base">
                          timer
                        </span>
                      </div>
                      <span className="text-gray-600 font-medium text-xs sm:text-sm">
                        Response Time
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      &lt; 2 hrs
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined text-sm sm:text-base">
                          check_circle
                        </span>
                      </div>
                      <span className="text-gray-600 font-medium text-xs sm:text-sm">
                        Job Success
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      98%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <span className="material-symbols-outlined text-sm sm:text-base">
                          repeat
                        </span>
                      </div>
                      <span className="text-gray-600 font-medium text-xs sm:text-sm">
                        Repeat Hire
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      95%
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    Reviews
                  </h3>
                  <div className="flex items-center gap-0.5 sm:gap-1 text-amber-500">
                    <span className="font-bold text-lg sm:text-xl">
                      {professional.averageRating.toFixed(1)}
                    </span>
                    <span className="material-symbols-outlined fill-current text-sm sm:text-base">
                      star
                    </span>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {professional.ratingDistribution.map((dist) => (
                    <div
                      key={dist.stars}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-0.5 sm:gap-1 w-10 sm:w-12 font-medium text-gray-600">
                        {dist.stars}{" "}
                        <span className="material-symbols-outlined text-gray-300 text-xs">
                          star
                        </span>
                      </div>
                      <div className="flex-1 h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              professional.totalReviews > 0
                                ? (dist.count / professional.totalReviews) * 100
                                : 0
                            }%`,
                          }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-amber-400 rounded-full"
                        />
                      </div>
                      <span className="text-gray-500 w-6 sm:w-8 text-right">
                        {dist.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Badge */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 text-white text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-xl sm:text-2xl">
                    security
                  </span>
                </div>
                <h4 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">
                  Verified Professional
                </h4>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                  Identity verified, background checked, and skills assessed by
                  JustInTime.
                </p>
              </div>

              {/* Mobile-only CTA */}
              <div className="lg:hidden bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-lg">Ready to Book?</p>
                    <p className="text-emerald-100 text-sm">
                      Get started today
                    </p>
                  </div>
                  <button
                    onClick={handleBookNow}
                    className="px-4 py-2 bg-white text-emerald-700 rounded-lg font-bold hover:bg-emerald-50 transition-colors text-sm"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
