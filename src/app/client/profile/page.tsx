"use client";

import ImageCropper from "@/components/ImageCropper";
import {
  useClientProfile,
  useUpdateClientProfile,
} from "@/lib/api/hooks/useClientProfile";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function ClientProfilePage() {
  const { data: profile, isLoading } = useClientProfile();
  const updateProfileMutation = useUpdateClientProfile();
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    clientInterests: [] as string[],
  });
  const [isPristine, setIsPristine] = useState(true);

  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (profile && isPristine) {
      setFormData({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        clientInterests: profile.clientInterests || [],
      });
    }
  }, [profile, isPristine]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIsPristine(false);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData, {
      onSuccess: () => {
        setIsPristine(true);
      },
    });
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowImageCropper(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingAvatar(true);
    setShowImageCropper(false);

    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "profile.jpg");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      await updateProfileMutation.mutateAsync({ image: data.url });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 sm:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
        <div>
          <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900">
            My Profile
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            Manage your personal information and preferences.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-sm lg:shadow-md border border-gray-200 overflow-hidden">
        {/* Header / Cover */}
        <div className="h-20 sm:h-24 lg:h-32 bg-gradient-to-r from-emerald-500 to-teal-600 relative"></div>

        <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
          <div className="relative flex justify-between items-end -mt-8 sm:-mt-10 lg:-mt-12 mb-4 sm:mb-6 lg:mb-8">
            <div className="relative">
              <div
                className={`${
                  isMobile ? "w-16 h-16" : "w-20 h-20 sm:w-24 sm:h-24"
                } rounded-lg sm:rounded-xl lg:rounded-2xl border-3 sm:border-4 border-white shadow-md sm:shadow-lg overflow-hidden bg-white relative`}
              >
                {profile?.image ? (
                  <Image
                    src={profile.image}
                    alt={profile.name || "Profile"}
                    fill
                    className="object-cover"
                    sizes={isMobile ? "64px" : "96px"}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 text-lg sm:text-xl lg:text-2xl font-bold">
                    {profile?.name?.charAt(0) || "U"}
                  </div>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 p-1.5 sm:p-2 bg-white rounded-full shadow-sm sm:shadow-md border border-gray-100 text-gray-600 hover:text-emerald-600 transition-colors ${
                  isMobile ? "text-xs" : ""
                }`}
                title="Change photo"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">
                  photo_camera
                </span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarSelect}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Email cannot be changed
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg sm:rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="+254 7XX XXX XXX"
                />
              </div>
            </div>

            {/* Mobile: Additional Quick Info */}
            {isMobile && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">
                    Member Since
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        )
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">
                    Account Status
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                    Active
                  </span>
                </div>
              </div>
            )}

            <div className="pt-3 sm:pt-4 border-t border-gray-100 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-3">
              {/* Mobile: Account Info */}
              {isMobile && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-base">
                    verified
                  </span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      Verified Account
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Last updated: Today
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className={`${
                  isMobile ? "w-full" : ""
                } bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm sm:shadow-md disabled:opacity-70 flex items-center justify-center gap-2 text-sm sm:text-base`}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">
                      save
                    </span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Link
          href="/client/settings"
          className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">shield</span>
          Security & Privacy
        </Link>
        <Link
          href="/client/settings?tab=notifications"
          className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">
            notifications
          </span>
          Notification Settings
        </Link>
      </div>

      {showImageCropper && selectedImage && (
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowImageCropper(false)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
