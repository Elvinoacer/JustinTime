"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect, useRef } from "react";
import {
  Shield,
  Lock,
  Eye,
  Database,
  Cookie,
  UserCheck,
  Mail,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
const sections = [
  { id: "introduction", title: "Introduction", icon: Shield },
  { id: "information", title: "Information We Collect", icon: Database },
  { id: "usage", title: "How We Use Your Information", icon: Eye },
  { id: "sharing", title: "Information Sharing", icon: UserCheck },
  { id: "security", title: "Data Security", icon: Lock },
  { id: "cookies", title: "Cookies & Tracking", icon: Cookie },
  { id: "rights", title: "Your Rights", icon: UserCheck },
  { id: "contact", title: "Contact Us", icon: Mail },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) =>
        document.getElementById(s.id),
      );
      const scrollPosition = window.scrollY + (isMobile ? 80 : 100);

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const element = sectionElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = isMobile ? 80 : 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  // Mobile Table of Contents Component
  const MobileTOC = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Contents</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">Privacy</span>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg max-h-[70vh] overflow-y-auto"
          >
            <nav className="p-4 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      activeSection === section.id
                        ? "bg-blue-50 text-blue-700 font-medium border border-blue-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        activeSection === section.id
                          ? "text-blue-600"
                          : "text-gray-400"
                      }`}
                    />
                    <span className="text-sm flex-1">{section.title}</span>
                    {activeSection === section.id && (
                      <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-gray-50 via-white to-blue-50/30">
      <Header />

      {/* Mobile Table of Contents */}
      <MobileTOC />

      <main className="flex-1 container mx-auto px-3 xs:px-4 sm:px-6 py-8 pt-16 sm:pt-20 lg:pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
            </div>
            <h1 className="text-2xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 px-2">
              Privacy Policy
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-2 sm:mb-3 md:mb-4 px-2">
              Your privacy is important to us. This policy explains how we
              collect, use, and protect your personal information.
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8">
            {/* Table of Contents - Sticky Sidebar (Desktop) */}
            <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
              <div className="sticky top-24 bg-white rounded-xl xl:rounded-2xl border border-gray-200 p-4 xl:p-6 shadow-sm">
                <h2 className="text-xs xl:text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 xl:mb-4">
                  Contents
                </h2>
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-2 xl:gap-3 px-2 xl:px-3 py-2 xl:py-2.5 rounded-lg text-left transition-all group ${
                          activeSection === section.id
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0 ${
                            activeSection === section.id
                              ? "text-blue-600"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        <span className="text-xs xl:text-sm flex-1 truncate">
                          {section.title}
                        </span>
                        {activeSection === section.id && (
                          <ChevronRight className="w-3 h-3 xl:w-4 xl:h-4 text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-9 xl:col-span-9">
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
                  {/* Introduction */}
                  <section
                    id="introduction"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 mb-8 sm:mb-10 md:mb-12"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Introduction
                      </h2>
                    </div>
                    <div className="space-y-3 text-sm sm:text-base text-gray-600 leading-relaxed ml-0 sm:ml-0 md:ml-0">
                      <p>
                        At JustInTime ("we," "our," or "us"), we are committed
                        to protecting your privacy and ensuring the security of
                        your personal information. This Privacy Policy explains
                        how we collect, use, disclose, and safeguard your
                        information when you visit our website{" "}
                        <span className="text-blue-600 font-medium">
                          www.justintime.co.ke
                        </span>{" "}
                        or use our mobile application and services.
                      </p>
                      <p>
                        By using JustInTime, you consent to the data practices
                        described in this policy. If you do not agree with our
                        policies and practices, please do not use our services.
                      </p>
                    </div>
                  </section>

                  {/* Information We Collect */}
                  <section
                    id="information"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 mb-8 sm:mb-10 md:mb-12"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center shrink-0">
                        <Database className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Information We Collect
                      </h2>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                      <div>
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 mb-2">
                          Personal Information
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-3">
                          We collect information that you provide directly to
                          us, including:
                        </p>
                        <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <span>
                              Name, email address, phone number, and postal
                              address
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <span>
                              Profile information, including profile photo and
                              bio
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <span>
                              Payment information (processed securely through
                              third-party providers)
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <span>
                              Identity verification documents (for service
                              providers)
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <span>
                              Communications with us and other users through our
                              platform
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 mb-2">
                          Automatically Collected Information
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-3">
                          When you use our services, we automatically collect
                          certain information, including:
                        </p>
                        <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                          <li className="flex items-start">
                            <span className="text-purple-500 mr-2 mt-1">•</span>
                            <span>
                              Device information (device type, operating system,
                              browser type)
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-purple-500 mr-2 mt-1">•</span>
                            <span>IP address and general location data</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-purple-500 mr-2 mt-1">•</span>
                            <span>
                              Usage data (pages visited, features used, time
                              spent on platform)
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-purple-500 mr-2 mt-1">•</span>
                            <span>
                              Cookies and similar tracking technologies
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* How We Use Your Information - Two column layout for desktop */}
                  <section
                    id="usage"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 mb-8 sm:mb-10 md:mb-12"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        How We Use Your Information
                      </h2>
                    </div>

                    <div className="md:grid md:grid-cols-2 md:gap-6 lg:gap-8">
                      <div className="space-y-3">
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                          We use the information we collect for various
                          purposes, including:
                        </p>
                        <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Providing, maintaining, and improving our services
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Processing transactions and sending related
                              information
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Facilitating connections between clients and
                              service providers
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Sending you technical notices, updates, and
                              support messages
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Responding to your comments, questions, and
                              customer service requests
                            </span>
                          </li>
                        </ul>
                      </div>
                      <div className="mt-4 md:mt-0">
                        <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Monitoring and analyzing trends, usage, and
                              activities
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Detecting, preventing, and addressing fraud and
                              security issues
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Personalizing your experience and delivering
                              relevant content
                            </span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-emerald-500 mr-2 mt-1">
                              •
                            </span>
                            <span>
                              Sending marketing communications (with your
                              consent)
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Information Sharing */}
                  <section
                    id="sharing"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 mb-8 sm:mb-10 md:mb-12"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Information Sharing
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        We may share your information in the following
                        circumstances:
                      </p>
                      <ul className="text-sm sm:text-base text-gray-600 space-y-3 ml-0">
                        <li className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-100">
                          <strong className="text-orange-700">
                            With Other Users:
                          </strong>{" "}
                          When you use our services, certain information (name,
                          profile photo, ratings) is visible to other users
                        </li>
                        <li className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100">
                          <strong className="text-blue-700">
                            Service Providers:
                          </strong>{" "}
                          We share information with third-party vendors who
                          perform services on our behalf (payment processing,
                          data analysis, email delivery)
                        </li>
                        <li className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-100">
                          <strong className="text-purple-700">
                            Legal Requirements:
                          </strong>{" "}
                          We may disclose information if required by law or in
                          response to valid requests by public authorities
                        </li>
                        <li className="bg-emerald-50 p-3 sm:p-4 rounded-lg border border-emerald-100">
                          <strong className="text-emerald-700">
                            Business Transfers:
                          </strong>{" "}
                          In connection with any merger, sale, or acquisition,
                          your information may be transferred
                        </li>
                        <li className="bg-teal-50 p-3 sm:p-4 rounded-lg border border-teal-100">
                          <strong className="text-teal-700">
                            With Your Consent:
                          </strong>{" "}
                          We may share information with your explicit consent
                        </li>
                      </ul>
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                        <p className="text-sm sm:text-base text-gray-700 m-0">
                          <strong className="text-gray-900">Note:</strong> We do
                          not sell your personal information to third parties.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Data Security */}
                  <section
                    id="security"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 mb-8 sm:mb-10 md:mb-12"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Data Security
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        We implement appropriate technical and organizational
                        measures to protect your personal information against
                        unauthorized access, alteration, disclosure, or
                        destruction. These measures include:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                          <p className="text-sm text-gray-700 m-0">
                            <strong className="text-red-700">
                              SSL/TLS encryption
                            </strong>{" "}
                            for data transmission
                          </p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                          <p className="text-sm text-gray-700 m-0">
                            <strong className="text-red-700">
                              Secure data storage
                            </strong>{" "}
                            with encryption at rest
                          </p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                          <p className="text-sm text-gray-700 m-0">
                            <strong className="text-red-700">
                              Regular security audits
                            </strong>{" "}
                            and vulnerability assessments
                          </p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                          <p className="text-sm text-gray-700 m-0">
                            <strong className="text-red-700">
                              Access controls
                            </strong>{" "}
                            and authentication mechanisms
                          </p>
                        </div>
                      </div>
                      <div className="bg-amber-50 border-l-3 sm:border-l-4 border-amber-500 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs sm:text-sm text-amber-800 m-0">
                          <strong>Note:</strong> While we strive to protect your
                          information, no method of transmission over the
                          internet or electronic storage is 100% secure. We
                          cannot guarantee absolute security.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Cookies & Tracking */}
                  <section
                    id="cookies"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 mb-8 sm:mb-10 md:mb-12"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-pink-100 to-pink-200 rounded-lg flex items-center justify-center shrink-0">
                        <Cookie className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Cookies & Tracking Technologies
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        We use cookies and similar tracking technologies to
                        track activity on our service and store certain
                        information. Cookies are files with small amounts of
                        data that are sent to your browser from a website and
                        stored on your device.
                      </p>

                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 mb-2">
                        Types of Cookies We Use
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                          <strong className="text-pink-700 text-sm">
                            Essential Cookies:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Required for the operation of our website
                          </p>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                          <strong className="text-pink-700 text-sm">
                            Functional Cookies:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Remember your preferences and settings
                          </p>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                          <strong className="text-pink-700 text-sm">
                            Analytics Cookies:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Help us understand how visitors use our website
                          </p>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                          <strong className="text-pink-700 text-sm">
                            Marketing Cookies:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Track your visits across websites to deliver
                            relevant ads
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700 m-0">
                          You can instruct your browser to refuse all cookies or
                          to indicate when a cookie is being sent. However, some
                          parts of our service may not function properly without
                          cookies.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Your Rights */}
                  <section
                    id="rights"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24 mb-8 sm:mb-10 md:mb-12"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Your Rights
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        Depending on your location, you may have certain rights
                        regarding your personal information:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <strong className="text-indigo-700 text-sm">
                            Access:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Request a copy of the personal information we hold
                            about you
                          </p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <strong className="text-indigo-700 text-sm">
                            Correction:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Request correction of inaccurate or incomplete
                            information
                          </p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <strong className="text-indigo-700 text-sm">
                            Deletion:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Request deletion of your personal information
                          </p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <strong className="text-indigo-700 text-sm">
                            Objection:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Object to processing of your personal information
                          </p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <strong className="text-indigo-700 text-sm">
                            Restriction:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Request restriction of processing your information
                          </p>
                        </div>
                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                          <strong className="text-indigo-700 text-sm">
                            Portability:
                          </strong>
                          <p className="text-xs text-gray-700 mt-1 mb-0">
                            Request transfer of your information to another
                            service
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700 m-0">
                          To exercise these rights, please contact us using the
                          information provided below. We will respond to your
                          request within 30 days.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Contact Us */}
                  <section
                    id="contact"
                    className="scroll-mt-16 sm:scroll-mt-20 lg:scroll-mt-24"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-linear-to-br from-teal-100 to-teal-200 rounded-lg flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Contact Us
                      </h2>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        If you have any questions about this Privacy Policy or
                        our data practices, please contact us:
                      </p>
                      <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs sm:text-sm text-gray-500 mb-1">
                                Email
                              </p>
                              <a
                                href="mailto:support@gtss.software"
                                className="text-blue-600 hover:text-blue-700 font-medium no-underline text-sm sm:text-base"
                              >
                                support@gtss.software
                              </a>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-gray-500 mb-1">
                                Phone
                              </p>
                              <a
                                href="tel:+254790670542"
                                className="text-blue-600 hover:text-blue-700 font-medium no-underline text-sm sm:text-base"
                              >
                                +254 790 670 542
                              </a>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm text-gray-500 mb-1">
                              Address
                            </p>
                            <p className="text-sm sm:text-base text-gray-700 m-0">
                              JustInTime
                              <br />
                              Nairobi, Kenya
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
