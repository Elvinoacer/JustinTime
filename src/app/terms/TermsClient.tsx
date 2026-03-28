"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Users,
  CreditCard,
  Shield,
  AlertTriangle,
  Gavel,
  RefreshCw,
  Mail,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms", icon: FileText },
  { id: "accounts", title: "User Accounts", icon: Users },
  { id: "services", title: "Our Services", icon: Shield },
  { id: "payments", title: "Payments & Fees", icon: CreditCard },
  { id: "conduct", title: "User Conduct", icon: AlertTriangle },
  { id: "termination", title: "Termination", icon: RefreshCw },
  { id: "liability", title: "Limitation of Liability", icon: Gavel },
  { id: "changes", title: "Changes to Terms", icon: RefreshCw },
  { id: "contact", title: "Contact Information", icon: Mail },
];

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState("acceptance");
  const [isTocOpen, setIsTocOpen] = useState(false);
  const tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) =>
        document.getElementById(s.id),
      );
      const scrollPosition = window.scrollY + 100;

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
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tocRef.current && !tocRef.current.contains(event.target as Node)) {
        setIsTocOpen(false);
      }
    };

    if (isTocOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isTocOpen]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setIsTocOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <Header />

      {/* Mobile TOC Button */}
      <button
        onClick={() => setIsTocOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-full shadow-lg shadow-purple-500/50 flex items-center justify-center"
        aria-label="Open table of contents"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile TOC Overlay */}
      {isTocOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div
            ref={tocRef}
            className="absolute inset-y-0 right-0 w-[85vw] max-w-sm bg-white p-5 shadow-2xl overflow-y-auto animate-in slide-in-from-right-8 duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-gray-900">
                Table of Contents
              </h2>
              <button
                onClick={() => setIsTocOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                      activeSection === section.id
                        ? "bg-purple-50 text-purple-700 font-medium border border-purple-200"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        activeSection === section.id
                          ? "text-purple-600"
                          : "text-gray-400"
                      }`}
                    />
                    <span className="text-sm flex-1">{section.title}</span>
                    {activeSection === section.id && (
                      <ChevronRight className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-8 sm:py-12 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 px-2">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-4 sm:mb-6 shadow-lg shadow-purple-500/30">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
              Terms of Service
            </h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-3 sm:mb-4 px-2 leading-relaxed">
              Please read these terms carefully before using the JustInTime
              platform. By using our services, you agree to these terms.
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Effective date:{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="lg:grid lg:grid-cols-12 lg:gap-6 xl:gap-8">
            {/* Table of Contents - Sticky Sidebar */}
            <aside className="hidden lg:block lg:col-span-3 xl:col-span-3">
              <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 sm:mb-4">
                  Contents
                </h2>
                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                          activeSection === section.id
                            ? "bg-purple-50 text-purple-700 font-medium border border-purple-200"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            activeSection === section.id
                              ? "text-purple-600"
                              : "text-gray-400 group-hover:text-gray-600"
                          }`}
                        />
                        <span className="text-xs xl:text-sm flex-1 leading-tight">
                          {section.title}
                        </span>
                        {activeSection === section.id && (
                          <ChevronRight className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-9 xl:col-span-9">
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-4 sm:p-6 md:p-8 lg:p-10 prose prose-sm sm:prose-base max-w-none">
                  {/* Acceptance */}
                  <section
                    id="acceptance"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Acceptance of Terms
                      </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      Welcome to JustInTime! These Terms of Service ("Terms")
                      govern your access to and use of the JustInTime website,
                      mobile application, and services (collectively, the
                      "Platform"). By accessing or using the Platform, you agree
                      to be bound by these Terms and our Privacy Policy.
                    </p>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-3">
                      If you do not agree to these Terms, you may not access or
                      use the Platform. We reserve the right to modify these
                      Terms at any time, and such modifications will be
                      effective immediately upon posting.
                    </p>
                    <div className="bg-purple-50 border-l-4 border-purple-500 p-3 sm:p-4 rounded-lg mt-3 sm:mt-4">
                      <p className="text-purple-800 text-xs sm:text-sm m-0 leading-relaxed">
                        <strong className="text-xs sm:text-sm">
                          Important:
                        </strong>{" "}
                        You must be at least 18 years old to use JustInTime. By
                        using our Platform, you represent and warrant that you
                        are at least 18 years of age.
                      </p>
                    </div>
                  </section>

                  {/* User Accounts */}
                  <section
                    id="accounts"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        User Accounts
                      </h2>
                    </div>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 sm:mt-6 mb-2 sm:mb-3">
                      Account Creation
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      When you create an account with us, you must provide
                      information that is accurate, complete, and current at all
                      times. Failure to do so constitutes a breach of the Terms,
                      which may result in immediate termination of your account.
                    </p>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-2">
                      You are responsible for:
                    </p>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6 mt-2">
                      <li>
                        Safeguarding your password and keeping your account
                        secure
                      </li>
                      <li>All activities that occur under your account</li>
                      <li>
                        Notifying us immediately of any unauthorized use of your
                        account
                      </li>
                      <li>
                        Ensuring your contact information is current and
                        accurate
                      </li>
                    </ul>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 sm:mt-6 mb-2 sm:mb-3">
                      Account Types
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      JustInTime offers two types of accounts:
                    </p>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6 mt-2">
                      <li>
                        <strong className="text-xs sm:text-sm">
                          Client Accounts:
                        </strong>{" "}
                        For users seeking services from professionals
                      </li>
                      <li>
                        <strong className="text-xs sm:text-sm">
                          Provider Accounts:
                        </strong>{" "}
                        For professionals offering their services to clients
                      </li>
                    </ul>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-3 sm:mt-4">
                      Service providers must undergo verification, including
                      identity verification and skills assessment, before
                      offering services on the Platform.
                    </p>
                  </section>

                  {/* Services */}
                  <section
                    id="services"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Our Services
                      </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      JustInTime is a marketplace platform that connects clients
                      with service providers. We facilitate these connections
                      but are not a party to the actual service agreements
                      between users.
                    </p>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 sm:mt-6 mb-2 sm:mb-3">
                      Platform Role
                    </h3>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                      <li>
                        We provide the platform to connect clients and service
                        providers
                      </li>
                      <li>We facilitate payments and hold funds in escrow</li>
                      <li>We verify provider identities and credentials</li>
                      <li>We maintain a rating and review system</li>
                      <li>We provide dispute resolution services</li>
                    </ul>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 sm:mt-6 mb-2 sm:mb-3">
                      What We Are Not
                    </h3>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                      <li>We are not an employer of service providers</li>
                      <li>
                        We do not guarantee the quality of services provided
                      </li>
                      <li>We are not liable for disputes between users</li>
                      <li>We do not provide insurance for services rendered</li>
                    </ul>
                  </section>

                  {/* Payments */}
                  <section
                    id="payments"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Payments & Fees
                      </h2>
                    </div>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 sm:mt-6 mb-2 sm:mb-3">
                      Service Fees
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      JustInTime charges the following fees:
                    </p>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6 mt-2">
                      <li>
                        <strong className="text-xs sm:text-sm">
                          Client Fee:
                        </strong>{" "}
                        10% platform fee on the total service amount
                      </li>
                      <li>
                        <strong className="text-xs sm:text-sm">
                          Provider Commission:
                        </strong>{" "}
                        10% commission on earnings
                      </li>
                      <li>
                        <strong className="text-xs sm:text-sm">
                          Payment Processing:
                        </strong>{" "}
                        Additional fees may apply depending on payment method
                      </li>
                    </ul>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 sm:mt-6 mb-2 sm:mb-3">
                      Payment Terms
                    </h3>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                      <li>
                        Clients pay the full amount (service cost + fees)
                        upfront
                      </li>
                      <li>Funds are held in escrow until service completion</li>
                      <li>
                        Providers receive payment within 24-48 hours after
                        client confirmation
                      </li>
                      <li>
                        Refunds are processed according to our refund policy
                      </li>
                    </ul>

                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-4 sm:mt-6 mb-2 sm:mb-3">
                      Cancellations
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      Cancellations more than 24 hours before the scheduled
                      service are eligible for full refunds (minus payment
                      processing fees). Cancellations within 24 hours may incur
                      a 20% cancellation fee to compensate the service provider.
                    </p>
                  </section>

                  {/* User Conduct */}
                  <section
                    id="conduct"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        User Conduct
                      </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      You agree not to engage in any of the following prohibited
                      activities:
                    </p>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6 mt-2">
                      <li>
                        Violating any laws, regulations, or third-party rights
                      </li>
                      <li>
                        Posting false, misleading, or fraudulent information
                      </li>
                      <li>Impersonating any person or entity</li>
                      <li>
                        Harassing, threatening, or discriminating against other
                        users
                      </li>
                      <li>Attempting to bypass our payment system</li>
                      <li>Scraping or data mining the Platform</li>
                      <li>
                        Posting spam, unsolicited messages, or advertisements
                      </li>
                      <li>
                        Interfering with the proper functioning of the Platform
                      </li>
                      <li>Uploading viruses or malicious code</li>
                    </ul>
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded-lg mt-3 sm:mt-4">
                      <p className="text-red-800 text-xs sm:text-sm m-0 leading-relaxed">
                        <strong className="text-xs sm:text-sm">Warning:</strong>{" "}
                        Violation of these conduct rules may result in immediate
                        account suspension or termination, and we may report
                        illegal activities to law enforcement.
                      </p>
                    </div>
                  </section>

                  {/* Termination */}
                  <section
                    id="termination"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Termination
                      </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      We may terminate or suspend your account and access to the
                      Platform immediately, without prior notice or liability,
                      for any reason, including but not limited to:
                    </p>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6 mt-2">
                      <li>Breach of these Terms</li>
                      <li>Fraudulent or illegal activity</li>
                      <li>Multiple user complaints or negative reviews</li>
                      <li>Extended period of inactivity</li>
                      <li>
                        Request from law enforcement or government agencies
                      </li>
                    </ul>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-3 sm:mt-4">
                      Upon termination, your right to use the Platform will
                      immediately cease. You may also terminate your account at
                      any time through your account settings or by contacting
                      us.
                    </p>
                  </section>

                  {/* Liability */}
                  <section
                    id="liability"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                        <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Limitation of Liability
                      </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      To the maximum extent permitted by law, JustInTime shall
                      not be liable for any indirect, incidental, special,
                      consequential, or punitive damages, including but not
                      limited to:
                    </p>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6 mt-2">
                      <li>Loss of profits, revenue, or data</li>
                      <li>Personal injury or property damage</li>
                      <li>Service interruptions or errors</li>
                      <li>Quality of services provided by service providers</li>
                      <li>Disputes between users</li>
                    </ul>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-3 sm:mt-4">
                      Our total liability for any claims arising from your use
                      of the Platform shall not exceed the amount of fees you
                      paid to JustInTime in the 12 months preceding the claim.
                    </p>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg mt-3 sm:mt-4">
                      <p className="text-blue-800 text-xs sm:text-sm m-0 leading-relaxed">
                        <strong className="text-xs sm:text-sm">Note:</strong>{" "}
                        The Platform is provided "as is" and "as available"
                        without warranties of any kind, either express or
                        implied.
                      </p>
                    </div>
                  </section>

                  {/* Changes */}
                  <section
                    id="changes"
                    className="scroll-mt-20 sm:scroll-mt-24 mb-8 sm:mb-12"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Changes to Terms
                      </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      We reserve the right to modify or replace these Terms at
                      any time at our sole discretion. We will provide notice of
                      any material changes by:
                    </p>
                    <ul className="text-sm sm:text-base text-gray-600 space-y-1.5 sm:space-y-2 ml-4 sm:ml-6 mt-2">
                      <li>Posting the new Terms on this page</li>
                      <li>
                        Updating the "Effective date" at the top of this page
                      </li>
                      <li>Sending an email notification to registered users</li>
                    </ul>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-3 sm:mt-4">
                      Your continued use of the Platform after any changes to
                      the Terms constitutes acceptance of those changes. We
                      recommend reviewing these Terms periodically.
                    </p>
                  </section>

                  {/* Contact */}
                  <section
                    id="contact"
                    className="scroll-mt-20 sm:scroll-mt-24"
                  >
                    <div className="flex items-center gap-3 mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg flex items-center justify-center">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 m-0">
                        Contact Information
                      </h2>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      If you have any questions about these Terms of Service,
                      please contact us:
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mt-3 sm:mt-4 border border-gray-200">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-1">
                            Email
                          </p>
                          <a
                            href="mailto:support@gtss.software"
                            className="text-sm sm:text-base text-purple-600 hover:text-purple-700 font-medium no-underline"
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
                            className="text-sm sm:text-base text-purple-600 hover:text-purple-700 font-medium no-underline"
                          >
                            +254 790 670 542
                          </a>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-1">
                            Address
                          </p>
                          <p className="text-sm sm:text-base text-gray-700 m-0 leading-relaxed">
                            JustInTime
                            <br />
                            Nairobi, Kenya
                          </p>
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
