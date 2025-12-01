"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useProviderProfile, useUpdateProviderProfile } from "@/lib/api/hooks/useProvider";
import { useSubscriptionStatus } from "@/lib/api/hooks/useSubscription";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import ImageCropper from "@/components/ImageCropper";

const ProfilePage = () => {
  const router = useRouter();
  const { data: profileData, isLoading } = useProviderProfile();
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useSubscriptionStatus();
  const updateProfileMutation = useUpdateProviderProfile();
  const [isMobile, setIsMobile] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [newSkill, setNewSkill] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image cropper state
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Location state
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  //Certifications and Education state
  const [showCertModal, setShowCertModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [newCertification, setNewCertification] = useState({ name: '', issuer: '', date: '', fileUrl: '' });
  const [newEducation, setNewEducation] = useState({ institution: '', degree: '', field: '', startYear: '', endYear: '' });
  const certFileInputRef = useRef<HTMLInputElement>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (profileData?.data) {
      setFormData({
        ...profileData.data,
        certifications: profileData.data.certifications || [],
        education: profileData.data.education || [],
      });
    }
  }, [profileData]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    // Create object URL for the image
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowImageCropper(true);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingAvatar(true);
    setShowImageCropper(false);
    
    try {
      const formData = new FormData();
      formData.append('file', croppedBlob, 'profile.jpg');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      // Update profile with new avatar URL
      await updateProfileMutation.mutateAsync({ image: data.url });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error("Failed to upload avatar", error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      setSelectedImage(null);
    }
  };

  const handleCropCancel = () => {
    setShowImageCropper(false);
    setSelectedImage(null);
  };

  const handleSave = async () => {
    try {
      // Prepare data with proper type conversions
      const updateData = {
        ...formData,
        hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : undefined,
      };
      
      await updateProfileMutation.mutateAsync(updateData);
      setIsEditing(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  const handleCancel = () => {
    setFormData(profileData?.data);
    setIsEditing(false);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((skill: string) => skill !== skillToRemove),
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  // Calculate profile completion
  const completionPercentage = (() => {
    if (!formData) return 0;
    const fields = [
      formData.name,
      formData.email,
      formData.phone,
      formData.location,
      formData.bio,
      formData.image,
      formData.hourlyRate,
      (formData.skills && formData.skills.length > 0),
    ];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  })();

  // Quick Actions handlers
  const handleChangePassword = () => {
    router.push('/dashboard/settings?tab=security');
  };

  const handleNotificationSettings = () => {
    router.push('/dashboard/settings?tab=notifications');
  };

  const handlePrivacySettings = () => {
    router.push('/dashboard/settings?tab=privacy');
  };

  const handleDownloadData = async () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text("Profile Data", 20, 20);
      
      // Personal Information
      doc.setFontSize(16);
      doc.text("Personal Information", 20, 40);
      doc.setFontSize(12);
      doc.text(`Name: ${formData.name || 'N/A'}`, 20, 50);
      doc.text(`Email: ${formData.email || 'N/A'}`, 20, 58);
      doc.text(`Phone: ${formData.phone || 'N/A'}`, 20, 66);
      doc.text(`Location: ${formData.location || 'N/A'}`, 20, 74);
      doc.text(`Hourly Rate: KES ${formData.hourlyRate || 'N/A'}`, 20, 82);
      
      // Bio
      doc.setFontSize(16);
      doc.text("Bio", 20, 100);
      doc.setFontSize(12);
      const bioLines = doc.splitTextToSize(formData.bio || 'N/A', 170);
      doc.text(bioLines, 20, 110);
      
      // Skills
      let yPos = 110 + (bioLines.length * 7) + 10;
      doc.setFontSize(16);
      doc.text("Skills", 20, yPos);
      doc.setFontSize(12);
      yPos += 10;
      (formData.skills || []).forEach((skill: string, index: number) => {
        doc.text(`• ${skill}`, 20, yPos);
        yPos += 7;
      });
      
      // Statistics
      yPos += 10;
      doc.setFontSize(16);
      doc.text("Statistics", 20, yPos);
      doc.setFontSize(12);
      yPos += 10;
      doc.text(`Member Since: ${formData.memberSince ? new Date(formData.memberSince).toLocaleDateString() : 'N/A'}`, 20, yPos);
      yPos += 7;
      doc.text(`Completed Jobs: ${formData.completedJobs || 0}`, 20, yPos);
      yPos += 7;
      doc.text(`Average Rating: ${formData.averageRating ? Number(formData.averageRating).toFixed(1) : 'N/A'}/5.0`, 20, yPos);
      
      // Save PDF
      doc.save(`profile-data-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Failed to download data", error);
    }
  };

  // Geolocation handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          
          const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          // Update formData with location and coordinates
          setFormData({
            ...formData,
            location: address,
            latitude,
            longitude,
          });
        } catch (error) {
          console.error('Failed to get address:', error);
          setFormData({
            ...formData,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
          });
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Failed to get location. Please ensure location permissions are enabled.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Certification handlers
  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCert(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      setNewCertification({ ...newCertification, fileUrl: data.url });
    } catch (error) {
      console.error("Failed to upload certification", error);
    } finally {
      setIsUploadingCert(false);
    }
  };

  const handleAddCertification = () => {
    if (newCertification.name && newCertification.issuer && newCertification.fileUrl) {
      const certifications = formData.certifications || [];
      setFormData({ ...formData, certifications: [...certifications, newCertification] });
      setNewCertification({ name: '', issuer: '', date: '', fileUrl: '' });
      setShowCertModal(false);
    }
  };

  const handleRemoveCertification = (index: number) => {
    const certifications = formData.certifications || [];
    setFormData({ ...formData, certifications: certifications.filter((_: any, i: number) => i !== index) });
  };

  // Education handlers
  const handleAddEducation = () => {
    if (newEducation.institution && newEducation.degree && newEducation.field) {
      const education = formData.education || [];
      setFormData({ ...formData, education: [...education, newEducation] });
      setNewEducation({ institution: '', degree: '', field: '', startYear: '', endYear: '' });
      setShowEduModal(false);
    }
  };

  const handleRemoveEducation = (index: number) => {
    const education = formData.education || [];
    setFormData({ ...formData, education: education.filter((_: any, i: number) => i !== index) });
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div role="status" aria-label="Loading profile" className={`border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin ${
          isMobile ? "w-10 h-10 border-3" : "w-12 h-12 border-4"
        }`} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      {/* Success Notification */}
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-3 sm:top-4 right-3 sm:right-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 shadow-lg z-50 flex items-center gap-2 sm:gap-3 max-w-[calc(100vw-2rem)]"
          role="alert"
          aria-live="polite"
        >
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-emerald-600 text-sm sm:text-base">
              check_circle
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-emerald-900 text-sm sm:text-base truncate">
              Profile Updated!
            </p>
            <p className="text-xs sm:text-sm text-emerald-700 truncate">
              Your changes have been saved successfully.
            </p>
          </div>
        </motion.div>
      )}

      {/* Image Cropper Modal */}
      {showImageCropper && selectedImage && (
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          isMobile={isMobile}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className={`font-bold text-gray-900 leading-tight mb-1 sm:mb-2 ${
            isMobile ? "text-xl sm:text-2xl" : "text-2xl md:text-3xl"
          }`}>
            Profile
          </h1>
          <p className={`text-gray-500 font-normal leading-normal ${
            isMobile ? "text-xs sm:text-sm" : "text-sm"
          }`}>
            Manage your personal information and skills
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className={`bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation ${
              isMobile ? "px-4 py-2 text-xs sm:text-sm self-start mt-2 sm:mt-0" : "px-6 py-2.5 text-sm"
            }`}
            aria-label="Edit profile"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-0">
            <button
              onClick={handleCancel}
              className={`bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation ${
                isMobile ? "px-3 py-2 text-xs sm:text-sm" : "px-6 py-2.5 text-sm"
              }`}
              aria-label="Cancel editing"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className={`bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 touch-manipulation ${
                isMobile ? "px-3 py-2 text-xs sm:text-sm" : "px-6 py-2.5 text-sm"
              }`}
              aria-label="Save changes"
            >
              {updateProfileMutation.isPending ? (
                <div role="status" className={`border-2 border-white/20 border-t-white rounded-full animate-spin ${
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                }`} />
              ) : (
                <span className="material-symbols-outlined text-sm">save</span>
              )}
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>

      {/* Profile Completion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl mb-4 sm:mb-5 md:mb-6 ${
          isMobile ? "p-4" : "p-5 sm:p-6"
        }`}
      >
        <div className={`flex items-center justify-between ${
          isMobile ? "mb-3" : "mb-4"
        }`}>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              Profile Completion
            </h3>
            <p className={`text-gray-600 ${
              isMobile ? "text-xs sm:text-sm" : "text-sm"
            }`}>
              {completionPercentage}% complete
            </p>
          </div>
          <div className={`relative ${isMobile ? "w-12 h-12" : "w-14 h-14 sm:w-16 sm:h-16"}`}>
            <svg className="transform -rotate-90 w-full h-full">
              <circle
                cx="50%"
                cy="50%"
                r="calc(50% - 3px)"
                stroke="#e5e7eb"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50%"
                cy="50%"
                r="calc(50% - 3px)"
                stroke="#10b981"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * (isMobile ? 18 : 22)}`}
                strokeDashoffset={`${
                  2 * Math.PI * (isMobile ? 18 : 22) * (1 - completionPercentage / 100)
                }`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-bold text-gray-900 ${
                isMobile ? "text-xs" : "text-sm sm:text-base"
              }`}>
                {completionPercentage}%
              </span>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </motion.div>

      {/* Profile Form */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
        isMobile ? "p-4 sm:p-5" : "p-6 md:p-8"
      }`}>
        {/* Avatar Section */}
        <div className={`flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-5 md:gap-6 ${
          isMobile ? "mb-6 pb-6" : "mb-7 md:mb-8 pb-6 md:pb-8"
        } border-b border-gray-200`}>
          <div className="relative group self-start">
            <div className={`rounded-full border-4 border-gray-100 overflow-hidden bg-gray-100 flex items-center justify-center ${
              isMobile ? "w-24 h-24 sm:w-28 sm:h-28" : "w-32 h-32"
            }`}>
              {isUploadingAvatar ? (
                <div className={`border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin ${
                  isMobile ? "w-6 h-6 border-3" : "w-8 h-8 border-4"
                }`} />
              ) : formData.image ? (
                <Image
                  src={formData.image}
                  alt={formData.name || "Profile"}
                  width={isMobile ? 112 : 128}
                  height={isMobile ? 112 : 128}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <span className={`material-symbols-outlined text-gray-400 ${
                  isMobile ? "text-4xl" : "text-5xl"
                }`}>
                  person
                </span>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed touch-manipulation"
              aria-label="Change profile picture"
            >
              <span className="material-symbols-outlined text-white text-xl sm:text-2xl md:text-3xl">
                photo_camera
              </span>
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-bold text-gray-900 mb-1 ${
              isMobile ? "text-lg sm:text-xl" : "text-xl md:text-2xl"
            }`}>
              {formData.name}
            </h2>
            <p className={`text-gray-500 ${
              isMobile ? "text-sm mb-2" : "text-base mb-3"
            }`}>
              Service Provider
            </p>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Green verification badge for profile completion (100%) */}
              {completionPercentage === 100 && (
                <span className={`bg-emerald-100 text-emerald-700 rounded-full font-semibold flex items-center gap-1 ${
                  isMobile ? "px-2 py-0.5 text-[10px] sm:text-xs" : "px-3 py-1 text-xs"
                }`}>
                  <span className="material-symbols-outlined text-xs">
                    verified
                  </span>
                  <span>Verified</span>
                </span>
              )}
              {/* Gold verification badge for premium subscription */}
              {subscriptionData?.subscription?.isPremium && (
                <span className={`bg-amber-100 text-amber-700 rounded-full font-semibold flex items-center gap-1 ${
                  isMobile ? "px-2 py-0.5 text-[10px] sm:text-xs" : "px-3 py-1 text-xs"
                }`}>
                  <span className="material-symbols-outlined text-xs">
                    verified
                  </span>
                  <span>Premium Verified</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <h3 className={`font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 ${
            isMobile ? "text-base sm:text-lg" : "text-lg"
          }`}>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
              person
            </span>
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                Full Name
              </label>
              {isEditing ? (
                <input
                  id="name"
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  aria-label="Full name"
                />
              ) : (
                <p className={`text-gray-900 ${
                  isMobile ? "py-2 text-sm" : "py-2.5"
                }`}>
                  {formData.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                Email Address
              </label>
              <p className={`text-gray-900 flex items-center gap-1.5 sm:gap-2 ${
                isMobile ? "py-2 text-sm" : "py-2.5"
              }`}>
                <span className="material-symbols-outlined text-gray-400 text-sm">
                  mail
                </span>
                {formData.email}
              </p>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                Phone Number
              </label>
              {isEditing ? (
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  aria-label="Phone number"
                />
              ) : (
                <p className={`text-gray-900 flex items-center gap-1.5 sm:gap-2 ${
                  isMobile ? "py-2 text-sm" : "py-2.5"
                }`}>
                  <span className="material-symbols-outlined text-gray-400 text-sm">
                    call
                  </span>
                  {formData.phone || "Not set"}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                Location
              </label>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    id="location"
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    className={`flex-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 ${
                      isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                    }`}
                    aria-label="Location"
                    placeholder="e.g., Nairobi, Kenya"
                  />
                  <button
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className={`bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap touch-manipulation ${
                      isMobile ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
                    }`}
                    aria-label="Get current location"
                    title="Get current location"
                  >
                    {isGettingLocation ? (
                      <>
                        <div className={`border-2 border-white/20 border-t-white rounded-full animate-spin ${
                          isMobile ? "w-3 h-3" : "w-4 h-4"
                        }`} />
                        <span className="hidden sm:inline">Getting...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">my_location</span>
                        <span className="hidden sm:inline">Get Location</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className={`text-gray-900 flex items-center gap-1.5 sm:gap-2 ${
                  isMobile ? "py-2 text-sm" : "py-2.5"
                }`}>
                  <span className="material-symbols-outlined text-gray-400 text-sm">
                    location_on
                  </span>
                  {formData.location || "Not set"}
                </p>
              )}
            </div>

            {/* Bio - Full Width */}
            <div className="md:col-span-2">
              <label
                htmlFor="bio"
                className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                Bio
              </label>
              {isEditing ? (
                <textarea
                  id="bio"
                  rows={3}
                  value={formData.bio || ""}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  aria-label="Bio"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className={`text-gray-900 ${
                  isMobile ? "py-2 text-sm" : "py-2.5"
                }`}>
                  {formData.bio || "No bio added yet"}
                </p>
              )}
            </div>

            {/* Hourly Rate */}
            <div>
              <label
                htmlFor="hourlyRate"
                className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                Hourly Rate (KES)
              </label>
              {isEditing ? (
                <input
                  id="hourlyRate"
                  type="number"
                  value={formData.hourlyRate || ""}
                  onChange={(e) => handleInputChange("hourlyRate", e.target.value)}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  aria-label="Hourly rate"
                  placeholder="e.g., 1500"
                />
              ) : (
                <p className={`text-gray-900 ${
                  isMobile ? "py-2 text-sm" : "py-2.5"
                }`}>
                  {formData.hourlyRate ? `KES ${Number(formData.hourlyRate).toLocaleString()}` : "Not set"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div>
          <h3 className={`font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 ${
            isMobile ? "text-base sm:text-lg" : "text-lg"
          }`}>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
              workspace_premium
            </span>
            Skills & Expertise
          </h3>

          {/* Skills Display */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {formData.skills.map((skill: string) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1.5 ${
                  isMobile ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
                }`}
              >
                {skill}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors touch-manipulation"
                    aria-label={`Remove ${skill} skill`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      close
                    </span>
                  </button>
                )}
              </motion.span>
            ))}
          </div>

          {/* Add Skill Input */}
          {isEditing && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
                placeholder="Add a new skill..."
                className={`flex-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 ${
                  isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                }`}
                aria-label="New skill"
              />
              <button
                onClick={handleAddSkill}
                className={`bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation ${
                  isMobile ? "px-3 py-2 text-xs sm:text-sm" : "px-4 py-2.5 text-sm"
                }`}
                aria-label="Add skill"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Add Skill</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mt-4 sm:mt-5 md:mt-6">
        {/* Account Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5"
        >
          <h3 className={`font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 ${
            isMobile ? "text-base sm:text-lg" : "text-lg"
          }`}>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
              analytics
            </span>
            Account Statistics
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {[
              { 
                label: "Member Since", 
                value: formData.memberSince ? new Date(formData.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "N/A", 
                icon: "event" 
              },
              {
                label: "Completed Jobs",
                value: formData.completedJobs?.toString() || "0",
                icon: "check_circle",
              },
              { 
                label: "Average Rating", 
                value: formData.averageRating ? `${Number(formData.averageRating).toFixed(1)}/5.0` : "N/A", 
                icon: "star" 
              },
              { 
                label: "Response Time", 
                value: formData.responseTime || "N/A", 
                icon: "schedule" 
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="material-symbols-outlined text-gray-400 text-sm">
                    {stat.icon}
                  </span>
                  <span className={`text-gray-600 ${
                    isMobile ? "text-xs sm:text-sm" : "text-sm"
                  }`}>
                    {stat.label}
                  </span>
                </div>
                <span className={`font-semibold text-gray-900 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5"
        >
          <h3 className={`font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 ${
            isMobile ? "text-base sm:text-lg" : "text-lg"
          }`}>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
              bolt
            </span>
            Quick Actions
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {[
              { label: "Change Password", icon: "lock", action: handleChangePassword },
              { label: "Notification Settings", icon: "notifications", action: handleNotificationSettings },
              { label: "Privacy Settings", icon: "shield", action: handlePrivacySettings },
              { label: "Download Data", icon: "download", action: handleDownloadData },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-left touch-manipulation"
                aria-label={action.label}
              >
                <span className="material-symbols-outlined text-gray-600 text-sm">
                  {action.icon}
                </span>
                <span className={`font-medium text-gray-700 flex-1 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  {action.label}
                </span>
                <span className="material-symbols-outlined text-gray-400 text-sm">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Subscription Section */}
      {!isLoadingSubscription && subscriptionData?.subscription && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`rounded-xl sm:rounded-2xl shadow-lg border-2 mt-4 sm:mt-5 md:mt-6 ${
            subscriptionData.subscription.isPremium
              ? "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border-amber-200"
              : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"
          } ${isMobile ? "p-4 sm:p-5" : "p-6 md:p-8"}`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5 md:gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className={`rounded-full flex items-center justify-center flex-shrink-0 ${
                  subscriptionData.subscription.isPremium
                    ? "bg-amber-100"
                    : "bg-gray-200"
                } ${isMobile ? "w-10 h-10" : "w-12 h-12"}`}>
                  <span className={`material-symbols-outlined ${
                    subscriptionData.subscription.isPremium
                      ? "text-amber-600"
                      : "text-gray-600"
                  } ${isMobile ? "text-xl" : "text-2xl"}`}>
                    workspace_premium
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className={`font-bold text-gray-900 ${
                    isMobile ? "text-lg sm:text-xl" : "text-xl md:text-2xl"
                  }`}>
                    {subscriptionData.subscription.plan} Plan
                  </h3>
                  {subscriptionData.subscription.isPremium && subscriptionData.subscription.daysRemaining && (
                    <p className={`text-gray-600 ${
                      isMobile ? "text-xs sm:text-sm" : "text-sm"
                    }`}>
                      {subscriptionData.subscription.daysRemaining} days remaining
                    </p>
                  )}
                </div>
              </div>

              {subscriptionData.subscription.isPremium ? (
                <div className="space-y-2">
                  <p className={`text-gray-700 ${
                    isMobile ? "text-sm" : "text-base"
                  }`}>
                    You're enjoying premium benefits including:
                  </p>
                  <ul className="space-y-1 sm:space-y-1.5">
                    {[
                      "Unlimited service listings",
                      "Priority support",
                      "Advanced analytics",
                      "Featured profile badge",
                      "Priority in search results",
                    ].map((benefit, index) => (
                      <li key={index} className="flex items-center gap-1.5 sm:gap-2 text-gray-700">
                        <span className="material-symbols-outlined text-amber-600 text-sm">
                          check_circle
                        </span>
                        <span className={`${
                          isMobile ? "text-xs sm:text-sm" : "text-sm"
                        }`}>
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <p className={`text-gray-700 ${
                    isMobile ? "text-sm" : "text-base"
                  }`}>
                    Upgrade to unlock premium features and grow your business faster!
                  </p>
                  <ul className="space-y-1 sm:space-y-1.5">
                    {[
                      "Unlimited service listings",
                      "Priority support & faster response times",
                      "Advanced analytics & insights",
                    ].map((benefit, index) => (
                      <li key={index} className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                        <span className="material-symbols-outlined text-emerald-600 text-sm">
                          star
                        </span>
                        <span className={`${
                          isMobile ? "text-xs sm:text-sm" : "text-sm"
                        }`}>
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {!subscriptionData.subscription.isPremium && (
              <div className="flex flex-col gap-2 sm:gap-3 mt-3 sm:mt-0">
                <button
                  onClick={() => router.push("/dashboard/premium")}
                  className={`bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap touch-manipulation ${
                    isMobile ? "px-4 py-2.5 text-xs sm:text-sm" : "px-6 py-3 text-sm"
                  }`}
                  aria-label="Upgrade to premium"
                >
                  <span className="material-symbols-outlined text-sm">
                    workspace_premium
                  </span>
                  <span>Upgrade to Premium</span>
                </button>
                <button
                  onClick={() => router.push("/dashboard/premium")}
                  className={`text-emerald-600 hover:text-emerald-700 active:text-emerald-800 transition-colors ${
                    isMobile ? "text-xs sm:text-sm px-4 py-1.5" : "text-sm px-6 py-2"
                  }`}
                >
                  View Pricing Plans →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Certifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 mt-4 sm:mt-5 md:mt-6 ${
          isMobile ? "p-4 sm:p-5" : "p-6 md:p-8"
        }`}
      >
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5 md:mb-6">
          <h3 className={`font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2 ${
            isMobile ? "text-base sm:text-lg" : "text-lg"
          }`}>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">workspace_premium</span>
            Certifications
          </h3>
          {isEditing && (
            <button
              onClick={() => setShowCertModal(true)}
              className={`bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation ${
                isMobile ? "px-3 py-1.5 text-xs sm:text-sm self-start xs:self-auto" : "px-4 py-2 text-sm"
              }`}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Certification</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {(formData.certifications || []).map((cert: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-sm sm:hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-gray-900 ${
                    isMobile ? "text-sm" : "text-base"
                  }`}>
                    {cert.name}
                  </h4>
                  <p className={`text-gray-600 mt-1 ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}>
                    {cert.issuer}
                  </p>
                  {cert.date && <p className={`text-gray-500 mt-1 ${
                    isMobile ? "text-[10px] sm:text-xs" : "text-xs"
                  }`}>
                    {cert.date}
                  </p>}
                  <a
                    href={cert.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 active:text-emerald-800 mt-2 ${
                      isMobile ? "text-xs" : "text-sm"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    View Certificate
                  </a>
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleRemoveCertification(index)}
                    className="text-red-600 hover:bg-red-50 active:bg-red-100 p-1 rounded transition-colors ml-2 flex-shrink-0 touch-manipulation"
                    aria-label="Remove certification"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {(formData.certifications || []).length === 0 && (
            <div className="col-span-2 text-center py-6 sm:py-8 text-gray-500">
              <span className={`material-symbols-outlined text-gray-300 mb-2 ${
                isMobile ? "text-3xl sm:text-4xl" : "text-4xl"
              }`}>
                workspace_premium
              </span>
              <p className={`${
                isMobile ? "text-sm" : "text-base"
              }`}>
                No certifications added yet
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Education Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`bg-white rounded-xl shadow-sm border border-gray-100 mt-4 sm:mt-5 md:mt-6 ${
          isMobile ? "p-4 sm:p-5" : "p-6 md:p-8"
        }`}
      >
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5 md:mb-6">
          <h3 className={`font-bold text-gray-900 flex items-center gap-1.5 sm:gap-2 ${
            isMobile ? "text-base sm:text-lg" : "text-lg"
          }`}>
            <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">school</span>
            Education
          </h3>
          {isEditing && (
            <button
              onClick={() => setShowEduModal(true)}
              className={`bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation ${
                isMobile ? "px-3 py-1.5 text-xs sm:text-sm self-start xs:self-auto" : "px-4 py-2 text-sm"
              }`}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Education</span>
            </button>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4">
          {(formData.education || []).map((edu: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-sm sm:hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-gray-900 ${
                    isMobile ? "text-sm" : "text-base"
                  }`}>
                    {edu.degree} in {edu.field}
                  </h4>
                  <p className={`text-gray-600 mt-1 ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}>
                    {edu.institution}
                  </p>
                  <p className={`text-gray-500 mt-1 ${
                    isMobile ? "text-[10px] sm:text-xs" : "text-xs"
                  }`}>
                    {edu.startYear} - {edu.endYear || 'Present'}
                  </p>
                </div>
                {isEditing && (
                  <button
                    onClick={() => handleRemoveEducation(index)}
                    className="text-red-600 hover:bg-red-50 active:bg-red-100 p-1 rounded transition-colors ml-2 flex-shrink-0 touch-manipulation"
                    aria-label="Remove education"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {(formData.education || []).length === 0 && (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <span className={`material-symbols-outlined text-gray-300 mb-2 ${
                isMobile ? "text-3xl sm:text-4xl" : "text-4xl"
              }`}>
                school
              </span>
              <p className={`${
                isMobile ? "text-sm" : "text-base"
              }`}>
                No education records added yet
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto ${
              isMobile ? "p-4" : "p-5 sm:p-6"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-gray-900 ${
                isMobile ? "text-base sm:text-lg" : "text-lg"
              }`}>
                Add Certification
              </h3>
              <button
                onClick={() => {
                  setShowCertModal(false);
                  setNewCertification({ name: '', issuer: '', date: '', fileUrl: '' });
                }}
                className="text-gray-400 hover:text-gray-600 active:text-gray-700 rounded-full p-1 transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Certification Name
                </label>
                <input
                  type="text"
                  value={newCertification.name}
                  onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  placeholder="e.g., AWS Certified Solutions Architect"
                />
              </div>
              <div>
                <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Issuing Organization
                </label>
                <input
                  type="text"
                  value={newCertification.issuer}
                  onChange={(e) => setNewCertification({ ...newCertification, issuer: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  placeholder="e.g., Amazon Web Services"
                />
              </div>
              <div>
                <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Issue Date (Optional)
                </label>
                <input
                  type="text"
                  value={newCertification.date}
                  onChange={(e) => setNewCertification({ ...newCertification, date: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  placeholder="e.g., January 2024"
                />
              </div>
              <div>
                <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Upload Certificate (PDF)
                </label>
                <input
                  type="file"
                  ref={certFileInputRef}
                  onChange={handleCertUpload}
                  accept="application/pdf"
                  className="hidden"
                />
                <button
                  onClick={() => certFileInputRef.current?.click()}
                  disabled={isUploadingCert}
                  className={`w-full border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 active:border-emerald-600 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation ${
                    isMobile ? "px-3 py-2.5 text-sm" : "px-4 py-2.5"
                  }`}
                >
                  {isUploadingCert ? (
                    <>
                      <div className={`border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin ${
                        isMobile ? "w-4 h-4" : "w-5 h-5"
                      }`} />
                      <span>Uploading...</span>
                    </>
                  ) : newCertification.fileUrl ? (
                    <>
                      <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                      <span>File Uploaded</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">upload_file</span>
                      <span>Click to Upload PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
              <button
                onClick={() => {
                  setShowCertModal(false);
                  setNewCertification({ name: '', issuer: '', date: '', fileUrl: '' });
                }}
                className={`flex-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation ${
                  isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCertification}
                disabled={!newCertification.name || !newCertification.issuer || !newCertification.fileUrl}
                className={`flex-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                }`}
              >
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Education Modal */}
      {showEduModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto ${
              isMobile ? "p-4" : "p-5 sm:p-6"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-gray-900 ${
                isMobile ? "text-base sm:text-lg" : "text-lg"
              }`}>
                Add Education
              </h3>
              <button
                onClick={() => {
                  setShowEduModal(false);
                  setNewEducation({ institution: '', degree: '', field: '', startYear: '', endYear: '' });
                }}
                className="text-gray-400 hover:text-gray-600 active:text-gray-700 rounded-full p-1 transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Institution
                </label>
                <input
                  type="text"
                  value={newEducation.institution}
                  onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  placeholder="e.g., University of Nairobi"
                />
              </div>
              <div>
                <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Degree
                </label>
                <input
                  type="text"
                  value={newEducation.degree}
                  onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  placeholder="e.g., Bachelor's, Master's"
                />
              </div>
              <div>
                <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}>
                  Field of Study
                </label>
                <input
                  type="text"
                  value={newEducation.field}
                  onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                    isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                  }`}
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                    isMobile ? "text-xs sm:text-sm" : "text-sm"
                  }`}>
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={newEducation.startYear}
                    onChange={(e) => setNewEducation({ ...newEducation, startYear: e.target.value })}
                    className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                      isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                    }`}
                    placeholder="2018"
                  />
                </div>
                <div>
                  <label className={`block font-medium text-gray-700 mb-1.5 sm:mb-2 ${
                    isMobile ? "text-xs sm:text-sm" : "text-sm"
                  }`}>
                    End Year
                  </label>
                  <input
                    type="text"
                    value={newEducation.endYear}
                    onChange={(e) => setNewEducation({ ...newEducation, endYear: e.target.value })}
                    className={`w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400 ${
                      isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                    }`}
                    placeholder="2022 or leave blank"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
              <button
                onClick={() => {
                  setShowEduModal(false);
                  setNewEducation({ institution: '', degree: '', field: '', startYear: '', endYear: '' });
                }}
                className={`flex-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation ${
                  isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEducation}
                disabled={!newEducation.institution || !newEducation.degree || !newEducation.field}
                className={`flex-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMobile ? "px-3 py-2 text-sm" : "px-4 py-2.5"
                }`}
              >
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;