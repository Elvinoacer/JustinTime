"use client";
import { use, useState } from "react";
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
  const { id: serviceId } = use(params);
  const { data: service, isLoading, error } = useService(serviceId);

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
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
          <span className="material-symbols-outlined text-gray-400 text-6xl mb-4">
            error
          </span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Failed to load service
          </h2>
          <p className="text-gray-500 mb-6">
            The service you are looking for might have been removed or is temporarily unavailable.
          </p>
          <Link
            href="/services"
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
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
            className={`flex flex-col items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-emerald-100 text-emerald-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {tab.icon}
            </span>
            <span className="mt-1">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              {crumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <span className="material-symbols-outlined text-xs mx-2">
                      chevron_right
                    </span>
                  )}
                  <Link
                    href={crumb.href}
                    className={`hover:text-emerald-600 transition-colors ${
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
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Provider Header */}
            <div className="p-6 md:p-8 border-b border-gray-200">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <div
                    className="w-24 h-24 md:w-32 md:h-32 bg-cover bg-center rounded-2xl border-4 border-white shadow-lg bg-gray-100"
                    style={{ backgroundImage: `url(${provider.image || '/placeholder-avatar.png'})` }}
                  >
                    {!provider.image && (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl">person</span>
                      </div>
                    )}
                  </div>
                  {profile?.isVerified && (
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full">
                      <span className="material-symbols-outlined text-sm">
                        verified
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {provider.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="material-symbols-outlined text-emerald-600">
                      work
                    </span>
                    <span className="text-gray-600">{service.category.name}</span>
                  </div>
                  {profile?.location && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-outlined text-emerald-600">
                        location_on
                      </span>
                      <span className="text-gray-600">{profile.location}</span>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined ${
                            i < Math.floor(provider.rating)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-600">
                      {provider.rating.toFixed(1)} ({provider.reviewCount}{" "}
                      reviews)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                  <Link 
                    href={`/booking?professional=${provider.id}&service=${service.id}`}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">calendar_month</span>
                    Book Now
                  </Link>
                  <Link 
                    href={`/client/messages?recipient=${provider.id}`}
                    className="border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">chat</span>
                    Message
                  </Link>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="p-6 md:p-8">
              {/* Desktop Tabs */}
              <div className="hidden md:flex border-b border-gray-200 mb-8">
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
                    className={`px-6 py-3 font-medium border-b-2 transition-colors ${
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
              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  {activeTab === "about" && (
                    <motion.div
                      key="about"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        About This Service
                      </h2>
                      <p className="text-gray-700 leading-relaxed mb-6">
                        {service.description}
                      </p>

                      {profile?.bio && (
                        <>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">About {provider.name}</h3>
                          <p className="text-gray-700 leading-relaxed mb-6">
                            {profile.bio}
                          </p>
                        </>
                      )}

                      {/* Pricing Info */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600">payments</span>
                          Pricing Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 hover:bg-white rounded-lg transition-colors">
                            <span className="text-gray-600">Service Price</span>
                            <span className="font-bold text-gray-900">
                              KES {service.price.toLocaleString()}
                            </span>
                          </div>
                          {profile?.hourlyRate && (
                            <div className="flex justify-between items-center p-2 hover:bg-white rounded-lg transition-colors">
                              <span className="text-gray-600">Hourly Rate</span>
                              <span className="font-bold text-gray-900">
                                KES {profile.hourlyRate.toLocaleString()}/hr
                              </span>
                            </div>
                          )}
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
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Other Services by {provider.name}
                      </h2>
                      {service.otherServices.length > 0 ? (
                        <div className="grid gap-3">
                          {service.otherServices.map((otherService, index) => (
                            <Link href={`/services/${otherService.id}`} key={otherService.id}>
                              <motion.div
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer group"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-emerald-600 bg-emerald-100 p-1 rounded-full">
                                    check
                                  </span>
                                  <div>
                                    <span className="text-gray-900 font-medium block group-hover:text-emerald-700 transition-colors">{otherService.title}</span>
                                    <span className="text-sm text-gray-500">{otherService.category.name}</span>
                                  </div>
                                </div>
                                <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-500">chevron_right</span>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No other services listed.</p>
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
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Gallery
                      </h2>
                      {service.images.length > 0 || service.video ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {service.video && (
                            <div className="aspect-video col-span-2 md:col-span-3 rounded-xl overflow-hidden bg-black">
                              <video src={service.video} controls className="w-full h-full" />
                            </div>
                          )}
                          {service.images.map((image, index) => (
                            <motion.div
                              key={index}
                              className="aspect-square bg-cover bg-center rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm hover:shadow-md bg-gray-100"
                              style={{ backgroundImage: `url(${image})` }}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.02 }}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No images available for this service.</p>
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
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Customer Reviews
                      </h2>
                      {provider.receivedReviews.length > 0 ? (
                        <div className="space-y-6">
                          {provider.receivedReviews.map((review, index) => (
                            <motion.div
                              key={review.id}
                              className="border-b border-gray-100 pb-6 last:border-b-0"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <div className="flex items-start gap-4">
                                <div
                                  className="w-12 h-12 bg-cover bg-center rounded-full border-2 border-white shadow-sm bg-gray-100"
                                  style={{
                                    backgroundImage: `url(${review.author.image || '/placeholder-avatar.png'})`,
                                  }}
                                >
                                  {!review.author.image && (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <span className="material-symbols-outlined text-xl">person</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h4 className="font-bold text-gray-900">
                                      {review.author.name || "Anonymous"}
                                    </h4>
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                      {new Date(review.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                      <span
                                        key={i}
                                        className={`material-symbols-outlined text-sm ${
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
                                    <p className="text-gray-600 mt-2 leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none">
                                      {review.comment}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No reviews yet.</p>
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
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Contact Information
                      </h2>
                      <div className="space-y-4">
                        {provider.phone && (
                          <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                            <div className="bg-white p-3 rounded-full shadow-sm">
                              <span className="material-symbols-outlined text-emerald-600">
                                call
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">Phone</p>
                              <p className="text-gray-600 font-medium">
                                {provider.phone}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                          <div className="bg-white p-3 rounded-full shadow-sm">
                            <span className="material-symbols-outlined text-emerald-600">
                              mail
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Email</p>
                            <p className="text-gray-600 font-medium">
                              {provider.email}
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

      <Footer />
    </div>
  );
};

export default ServiceDetailsPage;
