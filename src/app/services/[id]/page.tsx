"use client";
import { use, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ServiceDetailsPage = ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const [activeTab, setActiveTab] = useState("about");
  const { id: serviceId } = use(params);

  const provider = {
    name: "Samuel Mwangi",
    category: "Plumbing Services",
    location: "Nairobi, Kenya",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB7I6HKU9Vs6S57JMaKsFteXRSvIUdz0JSiAqqVCxueNGY0wmEPMmhABqJGTMCzeQSzqMtn4Mgd9s4B5ELiUr1dh8cfR_cxEv2Ta13ijfY8r0tbq4GiWDAQZFBOrb4Qq2Y5bMH2Yh7vHNqTT7FxGWCR1KVQk37KorhyzVPeH5K_3CgTedYEcEkCRP0ZA9s45dczf5iSJk4_ffSSs1stt00IcWwjk_JOOjsnrdzy0Jei7xeQG0lZPhSZaS4EyJAQ05SlPm5qgfEdgaY",
    about:
      "Samuel Mwangi is a certified plumber with over 5 years of experience in residential and commercial plumbing. He specializes in installations, repairs, and maintenance of plumbing systems. Samuel is known for his reliability, professionalism, and quality workmanship.",
    services: [
      "General Plumbing Repairs",
      "Water Heater Installation & Repair",
      "Drain Cleaning",
      "Pipe Installation & Repair",
      "Leak Detection & Repair",
      "Bathroom & Kitchen Plumbing",
      "Emergency Plumbing Services",
    ],
    gallery: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBwquD19ScE7FwYUzMx7fmiCd7sXjE94S1P8JmHDZYPiB5Vui9nbpHgxmsqYyvzLikYCOJCqJK17V8KMNFEi3RMatAxZ-Rhuc90IZbn_Ea4dTGqxfGFxOpqCMdlSzLyZ1deQnHifyYJmnIPKoBCbaE9dDiW1b_2f0gy_YiIMjrUslf4MmzxVpTV86QohTvnjKJfErF3Nq2bzBIiS9XZ5-JQMiApY059w1BNC-gLA5Ea_ydMCAtBwOLCV0e13rbFruy992p4Jmes2q4",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDZW-LtZLk-dTV0yAnHS2lP1Z9EEDqTcFN3vsAwW1uWtP4DPH05elXB_gQugvgQkldrmXkbmoyNHHMhd_6U-SC4OmpAubNSmhkXKTFgB_CcoNKvv-v07OFIxbp0IpHmN1vAZDMWV1g4dOlZuMg1vvk2fmxGrNlN6TSQP0bWis12ytuNLGVdTbSXWMFgez-FbyrdojrvVtFzrrXJNhJXJzPe3iBHUOj2iBIB3I13S0jLinMYhCmuN0UOXrsdMHMN52y5p28qkRqncfU",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAAc3pVN4jQNO7IpfJuJw7FpqO7cVTwtTwcXDom_6y-Fbp-CsVp5l71yP3a039_BwgtDDU7TaO9-MgMTW1fyVKWvnHdjQfxjHpzzQxupDB_Psb3l79O1Ast7BCtyZYse_dq0v4kXhPIv3IBsukM0xg1jeMFVfDBzf52dMn8eYmdGa8okAxL8NbhSCjYCn7g8ACvosMg0YNbyszJDL79ZxGGpyybde7ZtlNxYhnpUF7DLCxJSIsvyq9Xz_LyEOQWwuo486U5ucLAIrI",
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    ],
    reviews: {
      rating: 4.8,
      reviewCount: 25,
      items: [
        {
          author: "Aisha Hassan",
          date: "2 days ago",
          rating: 5,
          comment:
            "Samuel did an excellent job fixing a leak in my bathroom. He was prompt, professional, and the repair was done quickly and efficiently. Highly recommend!",
          authorImage:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuCgk2S-2-vDAPdjDAit2XuLIAwlBj6rB-yDXxFitEex_F8rRoaffE4wJC877iR-NF-gy45KADDJwk27XpgrN68DoRtsmgSA9FYJ5EvcjKUP4eWwbc3nPE5511a6pznSQRAFVacO1q6pFgj6ctXrpA_3PZqqZLiNDiidU3BYdsEYS90gTpN_0TLRXjxQ_hG3KvJqefUKqZQWWYzJPtL8pbKnVO75-tf43NCMIdkK8GpXXcJL1VYlmOS5F89ENoMgLoF6_pPJstdEcC8",
        },
        {
          author: "David Kamau",
          date: "1 week ago",
          rating: 4,
          comment:
            "Samuel installed a new water heater for me. He was very knowledgeable and provided great service. I'm very satisfied with his work.",
          authorImage:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuBQQkYqfW604H7WQ0kCOWMEbQ03daqIShErWXB3RGFtO9UcO_EYBnwZYD0ZkQtSgYVw2CDsDSbNipErz-mQf4SxvwD8Ff1GFexbdcDZzqZHi9C1MDNHrmEWQh11IPmwd0GoAMpgiZCoz1pCAXLCTOxpU2APOH2Ii0BC7ViUPSFt1WuIxex2VTnpxgvSyTDUcVtxam8gnlHIIMtZwEMmJf4Hmcm67Cal8--_Tq3P-tQgGXlgUAzFTtq-4lEO4rs5bHhDJQqhfG5Oc5I",
        },
        {
          author: "Grace Wanjiku",
          date: "3 days ago",
          rating: 5,
          comment:
            "Exceptional service! Samuel fixed our clogged drains in no time. Very professional and fair pricing. Will definitely call him again for any plumbing needs.",
          authorImage:
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80",
        },
      ],
    },
    contact: {
      phone: "+254 712 345 678",
      email: "samuel.plumbing@email.com",
      availability: "Available 24/7 for emergencies",
    },
    pricing: {
      hourlyRate: "$45/hr",
      serviceFee: "No additional service fee",
      freeEstimate: true,
    },
  };

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Services", href: "/services" },
    {
      name: provider.category,
      href: `/services?category=${provider.category
        .toLowerCase()
        .replace(/\s+/g, "-")}`,
    },
    { name: provider.name, href: `/services/${serviceId}` },
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
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        {" "}
        {/* Extra padding for mobile tabs */}
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
                  <a
                    href={crumb.href}
                    className={`hover:text-emerald-600 transition-colors ${
                      index === crumbs.length - 1
                        ? "text-gray-900 font-medium"
                        : ""
                    }`}
                  >
                    {crumb.name}
                  </a>
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
                    className="w-24 h-24 md:w-32 md:h-32 bg-cover bg-center rounded-2xl border-4 border-white shadow-lg"
                    style={{ backgroundImage: `url(${provider.imageUrl})` }}
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full">
                    <span className="material-symbols-outlined text-sm">
                      verified
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {provider.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="material-symbols-outlined text-emerald-600">
                      work
                    </span>
                    <span className="text-gray-600">{provider.category}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-emerald-600">
                      location_on
                    </span>
                    <span className="text-gray-600">{provider.location}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`material-symbols-outlined ${
                            i < Math.floor(provider.reviews.rating)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-600">
                      {provider.reviews.rating} ({provider.reviews.reviewCount}{" "}
                      reviews)
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                  <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">call</span>
                    Contact Now
                  </button>
                  <button className="border border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-xl font-semibold transition-colors">
                    Message
                  </button>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="p-6 md:p-8">
              {/* Desktop Tabs */}
              <div className="hidden md:flex border-b border-gray-200 mb-8">
                {[
                  { id: "about", label: "About" },
                  { id: "services", label: "Services" },
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
                        About
                      </h2>
                      <p className="text-gray-700 leading-relaxed">
                        {provider.about}
                      </p>

                      {/* Pricing Info */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600">payments</span>
                          Pricing Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 hover:bg-white rounded-lg transition-colors">
                            <span className="text-gray-600">Hourly Rate</span>
                            <span className="font-bold text-gray-900">
                              {provider.pricing.hourlyRate}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-2 hover:bg-white rounded-lg transition-colors">
                            <span className="text-gray-600">Service Fee</span>
                            <span className="font-bold text-gray-900">
                              {provider.pricing.serviceFee}
                            </span>
                          </div>
                          {provider.pricing.freeEstimate && (
                            <div className="flex justify-between items-center p-2 hover:bg-white rounded-lg transition-colors">
                              <span className="text-gray-600">Estimate</span>
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                Free Estimate
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
                        Services Offered
                      </h2>
                      <div className="grid gap-3">
                        {provider.services.map((service, index) => (
                          <motion.div
                            key={index}
                            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <span className="material-symbols-outlined text-emerald-600 bg-emerald-100 p-1 rounded-full">
                              check
                            </span>
                            <span className="text-gray-700 font-medium">{service}</span>
                          </motion.div>
                        ))}
                      </div>
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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {provider.gallery.map((image, index) => (
                          <motion.div
                            key={index}
                            className="aspect-square bg-cover bg-center rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm hover:shadow-md"
                            style={{ backgroundImage: `url(${image})` }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                          />
                        ))}
                      </div>
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
                      <div className="space-y-6">
                        {provider.reviews.items.map((review, index) => (
                          <motion.div
                            key={index}
                            className="border-b border-gray-100 pb-6 last:border-b-0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className="w-12 h-12 bg-cover bg-center rounded-full border-2 border-white shadow-sm"
                                style={{
                                  backgroundImage: `url(${review.authorImage})`,
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <h4 className="font-bold text-gray-900">
                                    {review.author}
                                  </h4>
                                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {review.date}
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
                                <p className="text-gray-600 mt-2 leading-relaxed bg-gray-50 p-3 rounded-lg rounded-tl-none">
                                  {review.comment}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
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
                        <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                          <div className="bg-white p-3 rounded-full shadow-sm">
                            <span className="material-symbols-outlined text-emerald-600">
                              call
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Phone</p>
                            <p className="text-gray-600 font-medium">
                              {provider.contact.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                          <div className="bg-white p-3 rounded-full shadow-sm">
                            <span className="material-symbols-outlined text-emerald-600">
                              mail
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Email</p>
                            <p className="text-gray-600 font-medium">
                              {provider.contact.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                          <div className="bg-white p-3 rounded-full shadow-sm">
                            <span className="material-symbols-outlined text-emerald-600">
                              schedule
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">Availability</p>
                            <p className="text-gray-600 font-medium">
                              {provider.contact.availability}
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
