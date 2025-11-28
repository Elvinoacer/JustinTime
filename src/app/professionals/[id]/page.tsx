"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfessional } from "@/lib/api/hooks/useProfessional";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { toast } from "sonner";

export default function ProfessionalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { data, isLoading, error } = useProfessional(id);
  const professional = data?.data;

  const [activeTab, setActiveTab] = useState<"about" | "services" | "reviews">("about");

  // Handler for booking
  const handleBookNow = () => {
    // Navigate to booking page with professional ID
    router.push(`/booking?professional=${id}`);
  };

  // Handler for WhatsApp message
  const handleSendMessage = () => {
    if (!professional?.phone) {
      toast.error("Phone number not available");
      return;
    }
    // Format phone number for WhatsApp (remove spaces, dashes, etc.)
    const formattedPhone = professional.phone.replace(/[^0-9+]/g, "");
    const message = encodeURIComponent(`Hi ${professional.name}, I found your profile on JustInTime and would like to discuss your services.`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };

  // Handler for sharing profile
  const handleShareProfile = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Profile link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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
            <span className="material-symbols-outlined text-gray-300 text-8xl mb-6">person_off</span>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Professional Not Found</h1>
            <p className="text-gray-600 mb-6">This professional may no longer be available.</p>
            <Link
              href="/professionals"
              className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
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
        <div className="relative bg-white pb-12">
          {/* Cover Background (Optional - using gradient for now) */}
          <div className="h-48 md:h-64 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/patterns/circuit-board.svg')] opacity-10" />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 pb-4">
              {/* Profile Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative -mt-24 md:-mt-32 shrink-0"
              >
                <div className="w-40 h-40 md:w-52 md:h-52 rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-white relative z-10">
                  {professional.image ? (
                    <img
                      src={professional.image}
                      alt={professional.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-6xl font-bold">
                      {professional.name.charAt(0)}
                    </div>
                  )}
                </div>
                {professional.isVerified && (
                  <div className="absolute bottom-2 -right-2 z-20 bg-blue-500 text-white p-2 rounded-full border-4 border-white shadow-lg" title="Verified Professional">
                    <span className="material-symbols-outlined text-xl md:text-2xl">verified</span>
                  </div>
                )}
              </motion.div>

              {/* Profile Info */}
              <div className="flex-1 w-full md:w-auto text-center md:text-left pt-2 md:pt-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl md:text-4xl font-bold text-gray-900 mb-2"
                    >
                      {professional.name}
                    </motion.h1>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm md:text-base text-gray-700"
                    >
                      {professional.location && (
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-600">location_on</span>
                          {professional.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-600">schedule</span>
                        Member since {new Date(professional.memberSince).getFullYear()}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-amber-400 fill-current">star</span>
                        <span className="font-bold text-gray-900">{professional.averageRating.toFixed(1)}</span>
                        <span className="text-gray-500">({professional.totalReviews} reviews)</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Action Buttons */}
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center md:justify-start gap-3"
                  >
                    <button 
                      onClick={handleShareProfile}
                      className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      title="Share Profile"
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      className="px-6 py-3 rounded-xl border border-emerald-600 text-emerald-600 font-semibold hover:bg-emerald-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined">chat</span>
                      Message
                    </button>
                    <button 
                      onClick={handleBookNow}
                      className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined">event_available</span>
                      Book Now
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Tabs */}
              <div className="border-b border-gray-200 overflow-x-auto">
                <div className="flex gap-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-4 font-medium text-base transition-all relative ${
                        activeTab === tab.id
                          ? "text-emerald-600"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
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

              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  {activeTab === "about" && (
                    <motion.div
                      key="about"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-8"
                    >
                      {/* Bio */}
                      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">About Me</h3>
                        <p className="text-gray-600 leading-relaxed text-lg">
                          {professional.bio || "No bio available."}
                        </p>
                      </div>

                      {/* Skills */}
                      {professional.skills.length > 0 && (
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                          <h3 className="text-xl font-bold text-gray-900 mb-6">Skills & Expertise</h3>
                          <div className="flex flex-wrap gap-3">
                            {professional.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl font-medium border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all cursor-default"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education & Certifications Grid */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {professional.education.length > 0 && (
                          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600">school</span>
                              Education
                            </h3>
                            <div className="space-y-6">
                              {professional.education.map((edu: any, idx: number) => (
                                <div key={idx} className="relative pl-6 border-l-2 border-gray-100 last:border-0">
                                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-200 border-2 border-white ring-1 ring-emerald-100" />
                                  <div className="font-bold text-gray-900">{edu.degree}</div>
                                  <div className="text-emerald-600 font-medium text-sm mb-1">{edu.field}</div>
                                  <div className="text-gray-500 text-sm">{edu.institution}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {edu.startYear} - {edu.endYear || "Present"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {professional.certifications.length > 0 && (
                          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600">workspace_premium</span>
                              Certifications
                            </h3>
                            <div className="space-y-4">
                              {professional.certifications.map((cert: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50/50 transition-colors group">
                                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm text-emerald-600">
                                    <span className="material-symbols-outlined">verified</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{cert.name}</div>
                                    <div className="text-gray-500 text-sm">{cert.issuer}</div>
                                    <div className="text-xs text-gray-400 mt-1">{cert.date}</div>
                                  </div>
                                  {cert.fileUrl && (
                                    <a
                                      href={cert.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"
                                      title="View Certificate"
                                    >
                                      <span className="material-symbols-outlined">visibility</span>
                                    </a>
                                  )}
                                </div>
                              ))}
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
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 border-dashed">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-gray-300 text-3xl">construction</span>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">No services listed</h3>
                          <p className="text-gray-500">This professional hasn't added any services yet.</p>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                          {professional.services.map((service) => (
                            <div
                              key={service.id}
                              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                              {/* Service Image */}
                              <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {service.images && service.images.length > 0 ? (
                                  <img
                                    src={service.images[0]}
                                    alt={service.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                    <span className="material-symbols-outlined text-gray-300 text-5xl">construction</span>
                                  </div>
                                )}
                                <div className="absolute top-3 right-3">
                                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold rounded-full shadow-sm">
                                    {service.pricingUnit === 'hourly' ? 'Hourly' : 'Fixed Price'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="p-6">
                                <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                  {service.title}
                                </h4>
                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-4 h-10">
                                  {service.description}
                                </p>
                                
                                <div className="flex items-end justify-between pt-4 border-t border-gray-50">
                                  <div>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">Price</p>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl font-bold text-gray-900">
                                        KES {service.price.toLocaleString()}
                                      </span>
                                      {service.pricingUnit === 'hourly' && (
                                        <span className="text-sm text-gray-500 font-medium">/hr</span>
                                      )}
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => router.push(`/booking?professional=${id}&service=${service.id}`)}
                                    className="w-10 h-10 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                                    title="Book this service"
                                  >
                                    <span className="material-symbols-outlined">arrow_forward</span>
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
                      className="space-y-6"
                    >
                      {professional.reviews.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 border-dashed">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-gray-300 text-3xl">rate_review</span>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews yet</h3>
                          <p className="text-gray-500">Be the first to review this professional.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {professional.reviews.map((review) => (
                            <div
                              key={review.id}
                              className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start gap-4">
                                {review.reviewer.image ? (
                                  <img
                                    src={review.reviewer.image}
                                    alt={review.reviewer.name || "User"}
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-lg ring-2 ring-gray-100">
                                    {(review.reviewer.name || "U").charAt(0)}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <div className="font-bold text-gray-900">{review.reviewer.name || "Anonymous"}</div>
                                      <div className="text-sm text-gray-500">
                                        {new Date(review.createdAt).toLocaleDateString("en-US", {
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                        })}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg">
                                      {[...Array(5)].map((_, i) => (
                                        <span
                                          key={i}
                                          className="material-symbols-outlined text-sm"
                                          style={{
                                            color: i < review.rating ? "#F59E0B" : "#E5E7EB",
                                            fontVariationSettings: "'FILL' 1"
                                          }}
                                        >
                                          star
                                        </span>
                                      ))}
                                      <span className="ml-1 text-sm font-bold text-amber-700">{review.rating}.0</span>
                                    </div>
                                  </div>
                                  {review.comment && (
                                    <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl rounded-tl-none">
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
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Performance Metrics</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <span className="material-symbols-outlined">timer</span>
                      </div>
                      <span className="text-gray-600 font-medium">Response Time</span>
                    </div>
                    <span className="font-bold text-gray-900">&lt; 2 hrs</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <span className="text-gray-600 font-medium">Job Success</span>
                    </div>
                    <span className="font-bold text-gray-900">98%</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <span className="material-symbols-outlined">repeat</span>
                      </div>
                      <span className="text-gray-600 font-medium">Repeat Hire</span>
                    </div>
                    <span className="font-bold text-gray-900">95%</span>
                  </div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Reviews</h3>
                  <div className="flex items-center gap-1 text-amber-500">
                    <span className="font-bold text-xl">{professional.averageRating.toFixed(1)}</span>
                    <span className="material-symbols-outlined fill-current">star</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {professional.ratingDistribution.map((dist) => (
                    <div key={dist.stars} className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 w-12 font-medium text-gray-600">
                        {dist.stars} <span className="material-symbols-outlined text-gray-300 text-sm">star</span>
                      </div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${professional.totalReviews > 0 ? (dist.count / professional.totalReviews) * 100 : 0}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full bg-amber-400 rounded-full"
                        />
                      </div>
                      <span className="text-gray-500 w-8 text-right">{dist.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Badge */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-2xl">security</span>
                </div>
                <h4 className="font-bold text-lg mb-2">Verified Professional</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Identity verified, background checked, and skills assessed by JustInTime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
