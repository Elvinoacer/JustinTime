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
      
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Identity Verification</h1>
            <p className="mt-2 text-gray-600">
              Complete these steps to become a verified professional on JustInTime.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />
              
              {[
                { step: 1, label: "Upload ID", active: true, completed: false },
                { step: 2, label: "Review", active: false, completed: false },
                { step: 3, label: "Verified", active: false, completed: false },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center bg-gray-50 px-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors ${
                      item.active ? "bg-emerald-600" : "bg-gray-300"
                    }`}
                  >
                    {item.completed ? (
                      <span className="material-symbols-outlined text-sm">check</span>
                    ) : (
                      item.step
                    )}
                  </div>
                  <span className={`mt-2 text-sm font-medium ${item.active ? "text-emerald-600" : "text-gray-500"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-start gap-4 mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <span className="material-symbols-outlined text-blue-600 mt-0.5">
                  info
                </span>
                <div>
                  <h4 className="font-bold text-blue-900">Why verify?</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Verified professionals get 3x more jobs and build trust faster with clients. We accept National ID, Passport, or Driver's License.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <label className="block font-bold text-gray-900 mb-2">
                  Upload Government ID
                </label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
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
                    <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl">
                          cloud_upload
                        </span>
                      </div>
                      <p className="text-lg font-medium text-gray-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        PNG, JPG or PDF (max. 10MB)
                      </p>
                    </label>
                  ) : (
                    <div className="w-full flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-600">
                          description
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setFile(null)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
                  <button className="px-6 py-2.5 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors">
                    Cancel
                  </button>
                  <button
                    disabled={!file}
                    className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all ${
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
      </main>
      
      <Footer />
    </div>
  );
}
