"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function VerificationPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Identity Verification
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Complete these steps to become a verified professional on
              JustInTime.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Left Column - Progress and Info */}
            <div className="space-y-6 md:space-y-8">
              {/* Progress Steps - Responsive */}
              <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">
                  Verification Progress
                </h2>

                <div className="relative">
                  <div className="absolute left-0 top-4 transform -translate-y-1/2 w-full h-1.5 bg-gray-200 -z-10" />

                  <div className="flex justify-between">
                    {[
                      {
                        step: 1,
                        label: "Upload ID",
                        active: true,
                        completed: false,
                      },
                      {
                        step: 2,
                        label: "Review",
                        active: false,
                        completed: false,
                      },
                      {
                        step: 3,
                        label: "Verified",
                        active: false,
                        completed: false,
                      },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className="flex flex-col items-center relative z-10"
                      >
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors ${
                            item.active ? "bg-emerald-600" : "bg-gray-300"
                          }`}
                        >
                          {item.completed ? (
                            <span className="material-symbols-outlined text-xs sm:text-sm">
                              check
                            </span>
                          ) : (
                            <span className="text-sm sm:text-base">
                              {item.step}
                            </span>
                          )}
                        </div>
                        <span
                          className={`mt-2 text-xs sm:text-sm font-medium ${
                            item.active ? "text-emerald-600" : "text-gray-500"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Why Verify Info Card */}
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-lg md:text-xl">
                      verified_user
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-blue-900 mb-2">
                      Benefits of Verification
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">
                          check_circle
                        </span>
                        <span className="text-xs sm:text-sm text-blue-700">
                          3x more job opportunities
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">
                          check_circle
                        </span>
                        <span className="text-xs sm:text-sm text-blue-700">
                          Build trust with clients faster
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">
                          check_circle
                        </span>
                        <span className="text-xs sm:text-sm text-blue-700">
                          Higher earning potential
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">
                          check_circle
                        </span>
                        <span className="text-xs sm:text-sm text-blue-700">
                          Priority support access
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Accepted Documents */}
              <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4">
                  Accepted Documents
                </h3>
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  {[
                    {
                      icon: "badge",
                      label: "National ID",
                      color: "bg-emerald-100 text-emerald-600",
                    },
                    {
                      icon: "travel_explore",
                      label: "Passport",
                      color: "bg-blue-100 text-blue-600",
                    },
                    {
                      icon: "directions_car",
                      label: "Driver's License",
                      color: "bg-purple-100 text-purple-600",
                    },
                  ].map((doc, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center p-3 bg-gray-50 rounded-xl"
                    >
                      <div
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 ${doc.color}`}
                      >
                        <span className="material-symbols-outlined text-lg md:text-xl">
                          {doc.icon}
                        </span>
                      </div>
                      <span className="text-xs text-center font-medium text-gray-700">
                        {doc.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Upload Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 md:p-8">
                <div className="mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">
                    Upload Government ID
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Supported formats: PNG, JPG, PDF (max. 10MB)
                  </p>
                </div>

                {/* Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center transition-colors cursor-pointer min-h-[280px] ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    id="file-upload"
                    accept=".png,.jpg,.jpeg,.pdf"
                  />

                  {!file ? (
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center cursor-pointer w-full"
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl">
                          cloud_upload
                        </span>
                      </div>
                      <p className="text-base sm:text-lg font-medium text-gray-900 text-center mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 text-center">
                        PNG, JPG or PDF (max. 10MB)
                      </p>
                      <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-emerald-600 text-sm">
                            check
                          </span>
                          <span className="text-xs sm:text-sm">
                            Max file size 10MB
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-emerald-600 text-sm">
                            check
                          </span>
                          <span className="text-xs sm:text-sm">
                            Clear, readable images
                          </span>
                        </div>
                      </div>
                    </label>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-center justify-between bg-emerald-50 p-3 sm:p-4 rounded-xl border border-emerald-100 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-emerald-600">
                            description
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 text-sm sm:text-base">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setFile(null)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          aria-label="Remove file"
                        >
                          <span className="material-symbols-outlined text-lg">
                            close
                          </span>
                        </button>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                          Ready to submit for verification
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      lightbulb
                    </span>
                    Upload Tips
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Ensure all four corners of your ID are visible</li>
                    <li>• Take photo in good lighting without glare</li>
                    <li>• File must be clear and legible</li>
                    <li>• Expired documents will not be accepted</li>
                  </ul>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button className="order-2 sm:order-1 px-5 py-2.5 sm:py-3 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm sm:text-base w-full sm:w-auto">
                      Cancel
                    </button>
                    <button
                      disabled={!file}
                      className={`order-1 sm:order-2 px-5 py-2.5 sm:py-3 rounded-xl text-white font-bold shadow-lg transition-all text-sm sm:text-base w-full sm:w-auto ${
                        file
                          ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200"
                          : "bg-gray-300 cursor-not-allowed"
                      }`}
                    >
                      Submit for Review
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Mobile-Only Bottom Info */}
          <div className="mt-6 md:hidden">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">
                Privacy & Security
              </h4>
              <p className="text-xs text-gray-600">
                Your documents are encrypted and stored securely. We only use
                them for verification purposes and never share them with third
                parties.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
