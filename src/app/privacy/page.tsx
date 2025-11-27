'use client';

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { Shield, Lock, Eye, Database, Cookie, UserCheck, Mail, ChevronRight } from "lucide-react";

const sections = [
  { id: "introduction", title: "Introduction", icon: Shield },
  { id: "information", title: "Information We Collect", icon: Database },
  { id: "usage", title: "How We Use Your Information", icon: Eye },
  { id: "sharing", title: "Information Sharing", icon: UserCheck },
  { id: "security", title: "Data Security", icon: Lock },
  { id: "cookies", title: "Cookies & Tracking", icon: Cookie },
  { id: "rights", title: "Your Rights", icon: UserCheck },
  { id: "contact", title: "Contact Us", icon: Mail }
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("introduction");

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 150;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const element = sectionElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
              Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Table of Contents - Sticky Sidebar */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
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
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${
                          activeSection === section.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                        }`} />
                        <span className="text-sm flex-1">{section.title}</span>
                        {activeSection === section.id && (
                          <ChevronRight className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-9">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="p-8 md:p-12 prose prose-lg max-w-none">
                  
                  {/* Introduction */}
                  <section id="introduction" className="scroll-mt-24 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">Introduction</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      At JustInTime ("we," "our," or "us"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <span className="text-blue-600">www.justintime.co.ke</span> or use our mobile application and services.
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      By using JustInTime, you consent to the data practices described in this policy. If you do not agree with our policies and practices, please do not use our services.
                    </p>
                  </section>

                  {/* Information We Collect */}
                  <section id="information" className="scroll-mt-24 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-purple-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">Information We Collect</h2>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Personal Information</h3>
                    <p className="text-gray-600 leading-relaxed">
                      We collect information that you provide directly to us, including:
                    </p>
                    <ul className="text-gray-600 space-y-2 ml-6">
                      <li>Name, email address, phone number, and postal address</li>
                      <li>Profile information, including profile photo and bio</li>
                      <li>Payment information (processed securely through third-party providers)</li>
                      <li>Identity verification documents (for service providers)</li>
                      <li>Communications with us and other users through our platform</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Automatically Collected Information</h3>
                    <p className="text-gray-600 leading-relaxed">
                      When you use our services, we automatically collect certain information, including:
                    </p>
                    <ul className="text-gray-600 space-y-2 ml-6">
                      <li>Device information (device type, operating system, browser type)</li>
                      <li>IP address and general location data</li>
                      <li>Usage data (pages visited, features used, time spent on platform)</li>
                      <li>Cookies and similar tracking technologies</li>
                    </ul>
                  </section>

                  {/* How We Use Your Information */}
                  <section id="usage" className="scroll-mt-24 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">How We Use Your Information</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      We use the information we collect for various purposes, including:
                    </p>
                    <ul className="text-gray-600 space-y-2 ml-6">
                      <li>Providing, maintaining, and improving our services</li>
                      <li>Processing transactions and sending related information</li>
                      <li>Facilitating connections between clients and service providers</li>
                      <li>Sending you technical notices, updates, and support messages</li>
                      <li>Responding to your comments, questions, and customer service requests</li>
                      <li>Monitoring and analyzing trends, usage, and activities</li>
                      <li>Detecting, preventing, and addressing fraud and security issues</li>
                      <li>Personalizing your experience and delivering relevant content</li>
                      <li>Sending marketing communications (with your consent)</li>
                    </ul>
                  </section>

                  {/* Information Sharing */}
                  <section id="sharing" className="scroll-mt-24 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-orange-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">Information Sharing</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      We may share your information in the following circumstances:
                    </p>
                    <ul className="text-gray-600 space-y-2 ml-6">
                      <li><strong>With Other Users:</strong> When you use our services, certain information (name, profile photo, ratings) is visible to other users</li>
                      <li><strong>Service Providers:</strong> We share information with third-party vendors who perform services on our behalf (payment processing, data analysis, email delivery)</li>
                      <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid requests by public authorities</li>
                      <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition, your information may be transferred</li>
                      <li><strong>With Your Consent:</strong> We may share information with your explicit consent</li>
                    </ul>
                    <p className="text-gray-600 leading-relaxed mt-4">
                      We do not sell your personal information to third parties.
                    </p>
                  </section>

                  {/* Data Security */}
                  <section id="security" className="scroll-mt-24 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                        <Lock className="w-5 h-5 text-red-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">Data Security</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                    </p>
                    <ul className="text-gray-600 space-y-2 ml-6">
                      <li>SSL/TLS encryption for data transmission</li>
                      <li>Secure data storage with encryption at rest</li>
                      <li>Regular security audits and vulnerability assessments</li>
                      <li>Access controls and authentication mechanisms</li>
                      <li>Employee training on data protection practices</li>
                    </ul>
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg mt-4">
                      <p className="text-amber-800 text-sm m-0">
                        <strong>Note:</strong> While we strive to protect your information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
                      </p>
                    </div>
                  </section>

                  {/* Cookies & Tracking */}
                  <section id="cookies" className="scroll-mt-24 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg flex items-center justify-center">
                        <Cookie className="w-5 h-5 text-pink-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">Cookies & Tracking Technologies</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      We use cookies and similar tracking technologies to track activity on our service and store certain information. Cookies are files with small amounts of data that are sent to your browser from a website and stored on your device.
                    </p>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Types of Cookies We Use</h3>
                    <ul className="text-gray-600 space-y-2 ml-6">
                      <li><strong>Essential Cookies:</strong> Required for the operation of our website</li>
                      <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                      <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
                      <li><strong>Marketing Cookies:</strong> Track your visits across websites to deliver relevant ads</li>
                    </ul>
                    <p className="text-gray-600 leading-relaxed mt-4">
                      You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some parts of our service may not function properly without cookies.
                    </p>
                  </section>

                  {/* Your Rights */}
                  <section id="rights" className="scroll-mt-24 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">Your Rights</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Depending on your location, you may have certain rights regarding your personal information:
                    </p>
                    <ul className="text-gray-600 space-y-2 ml-6">
                      <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                      <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                      <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                      <li><strong>Objection:</strong> Object to processing of your personal information</li>
                      <li><strong>Restriction:</strong> Request restriction of processing your information</li>
                      <li><strong>Portability:</strong> Request transfer of your information to another service</li>
                      <li><strong>Withdraw Consent:</strong> Withdraw previously given consent</li>
                    </ul>
                    <p className="text-gray-600 leading-relaxed mt-4">
                      To exercise these rights, please contact us using the information provided below. We will respond to your request within 30 days.
                    </p>
                  </section>

                  {/* Contact Us */}
                  <section id="contact" className="scroll-mt-24">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-teal-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 m-0">Contact Us</h2>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      If you have any questions about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <div className="bg-gray-50 rounded-xl p-6 mt-4 border border-gray-200">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Email</p>
                          <a href="mailto:privacy@justintime.co.ke" className="text-blue-600 hover:text-blue-700 font-medium no-underline">
                            privacy@justintime.co.ke
                          </a>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Phone</p>
                          <a href="tel:+254790670542" className="text-blue-600 hover:text-blue-700 font-medium no-underline">
                            +254 790 670 542
                          </a>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Address</p>
                          <p className="text-gray-700 m-0">
                            JustInTime<br />
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
