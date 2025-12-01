"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import apiClient from "@/lib/api/client";
import { useJob, useSubmitProposal } from "@/lib/api/hooks/useJobs";
import { useProviderProfile } from "@/lib/api/hooks/useProvider";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const JobDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const jobId = params.id as string;

  const [coverLetter, setCoverLetter] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [useProfile, setUseProfile] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch job details
  const { data: job, isLoading } = useJob(jobId);

  // Fetch provider profile (only if user is a provider)
  const { data: profile } = useProviderProfile();

  // Submit proposal mutation
  const submitProposal = useSubmitProposal();

  // Auto-populate form when useProfile is toggled
  useEffect(() => {
    if (useProfile && profile) {
      if (profile.bio) {
        setCoverLetter(profile.bio);
      }
      if (profile.hourlyRate) {
        setProposedPrice(profile.hourlyRate.toString());
      }
    }
  }, [useProfile, profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachments((prev) => [...prev, response.data.url]);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    const price = parseFloat(proposedPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const days = estimatedDays ? parseInt(estimatedDays) : undefined;
    if (estimatedDays && (isNaN(days!) || days! <= 0)) {
      toast.error("Please enter a valid duration");
      return;
    }

    if (coverLetter.length < 50) {
      toast.error("Cover letter must be at least 50 characters long");
      return;
    }

    submitProposal.mutate(
      {
        jobId,
        coverLetter,
        price,
        estimatedDays: days,
      },
      {
        onSuccess: () => {
          setCoverLetter("");
          setProposedPrice("");
          setEstimatedDays("");
          setAttachments([]);
          setShowForm(false);
          toast.success("Proposal submitted successfully!");
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message || "Failed to submit proposal"
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading job details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Job Not Found
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              The job you're looking for doesn't exist.
            </p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isMaxApplicantsReached =
    job.maxApplicants && (job._count?.proposals || 0) >= job.maxApplicants;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      {/* Mobile Back Button */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 z-30">
        <div className="flex items-center justify-between">
          <Link
            href="/jobs"
            className="flex items-center gap-2 text-gray-700 hover:text-emerald-600"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Jobs</span>
          </Link>
          <div className="text-right">
            {job.budget && (
              <div className="text-sm font-bold text-emerald-600">
                Kes {job.budget.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="px-3 sm:px-4 py-6 sm:py-8 md:py-12 pt-20 sm:pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Back Button */}
          <div className="hidden lg:block mb-6">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Job Header */}
              <motion.div
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-4 sm:mb-6">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                    {job.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-600 text-xs sm:text-sm">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 sm:w-4 sm:h-4" />
                      {job.category?.name || "General"}
                    </span>
                    <span className="hidden sm:flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                      Posted {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                  {job.deadline && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>
                        Deadline: {new Date(job.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>
                      {job._count?.proposals || 0}{" "}
                      {job.maxApplicants ? `/ ${job.maxApplicants}` : ""}{" "}
                      proposals
                    </span>
                  </div>
                </div>

                {/* Budget - Desktop */}
                {job.budget && (
                  <div className="hidden lg:block mt-6">
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
                      <p className="text-sm text-emerald-700 font-medium mb-1">
                        Client's Budget
                      </p>
                      <p className="text-2xl font-bold text-emerald-800">
                        Kes {job.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Job Description */}
              <motion.div
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Job Description
                </h2>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </motion.div>

              {/* Images */}
              {job.images && job.images.length > 0 && (
                <motion.div
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-100"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Job Photos
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                    {job.images
                      .slice(0, 3)
                      .map((image: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedImageIndex(index);
                            setShowImageGallery(true);
                          }}
                          className="relative w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden group"
                        >
                          <img
                            src={image}
                            alt={`Job attachment ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {job.images.length > 3 && index === 2 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-semibold">
                                +{job.images.length - 3} more
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}

              {/* Requirements & Timeline - Desktop */}
              <div className="hidden lg:grid grid-cols-2 gap-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    Requirements
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Detailed proposal with portfolio</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Professional experience in field</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>Clear timeline and milestones</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    Timeline
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">
                        Proposal Deadline
                      </div>
                      <div className="font-semibold text-gray-900">
                        {job.deadline
                          ? new Date(job.deadline).toLocaleDateString()
                          : "Flexible"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Project Start</div>
                      <div className="font-semibold text-gray-900">
                        Within 1-2 weeks
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Client Info */}
              <motion.div
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                  About the Client
                </h3>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                    {job.client?.image ? (
                      <img
                        src={job.client.image}
                        alt={job.client.name || "Client"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold text-lg sm:text-xl">
                        {job.client?.name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {job.client?.name || "Anonymous"}
                      </p>
                      {job.client?.isVerified && (
                        <Shield className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">Client</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-gray-500 ml-1">
                          Active now
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Budget - Mobile */}
              {job.budget && (
                <div className="lg:hidden">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                    <p className="text-sm text-emerald-700 font-medium mb-1">
                      Client's Budget
                    </p>
                    <p className="text-2xl font-bold text-emerald-800">
                      Kes {job.budget.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Apply Section */}
              <motion.div
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                  Submit Proposal
                </h3>

                {isMaxApplicantsReached ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="font-bold text-sm sm:text-base">
                        Applications Closed
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm">
                      This job has reached its maximum number of applicants (
                      {job.maxApplicants}). The client is currently reviewing
                      the existing proposals.
                    </p>
                  </div>
                ) : !showForm ? (
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    Apply for this Job
                  </button>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-3 sm:space-y-4"
                  >
                    {/* Use Profile Toggle */}
                    {session?.user?.role === "PROVIDER" &&
                      profile &&
                      (profile.bio || profile.hourlyRate) && (
                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <label
                              htmlFor="useProfile"
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                id="useProfile"
                                checked={useProfile}
                                onChange={(e) =>
                                  setUseProfile(e.target.checked)
                                }
                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                              />
                              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                                Use My Profile Information
                              </span>
                            </label>
                          </div>

                          {useProfile && (
                            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-emerald-200 space-y-2">
                              {profile.bio && (
                                <div>
                                  <p className="text-xs font-medium text-emerald-700 mb-1">
                                    Bio Preview:
                                  </p>
                                  <p className="text-xs text-gray-700 line-clamp-2">
                                    {profile.bio}
                                  </p>
                                </div>
                              )}
                              {profile.skills && profile.skills.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-emerald-700 mb-1">
                                    Skills:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {profile.skills
                                      .slice(0, 3)
                                      .map((skill: string, idx: number) => (
                                        <span
                                          key={idx}
                                          className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    {profile.skills.length > 3 && (
                                      <span className="text-xs text-emerald-600">
                                        +{profile.skills.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    <div>
                      <label
                        htmlFor="coverLetter"
                        className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                      >
                        Cover Letter *
                      </label>
                      <textarea
                        id="coverLetter"
                        required
                        rows={4}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none text-sm sm:text-base"
                        placeholder="Explain why you're the best fit for this job..."
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {coverLetter.length} / 50 characters min
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          htmlFor="proposedPrice"
                          className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                        >
                          Price (Kes) *
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="number"
                            id="proposedPrice"
                            required
                            min="0"
                            step="0.01"
                            value={proposedPrice}
                            onChange={(e) => setProposedPrice(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm sm:text-base"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="estimatedDays"
                          className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                        >
                          Duration (Days)
                        </label>
                        <input
                          type="number"
                          id="estimatedDays"
                          min="1"
                          step="1"
                          value={estimatedDays}
                          onChange={(e) => setEstimatedDays(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm sm:text-base"
                          placeholder="e.g. 7"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Attachments
                      </label>
                      <div className="space-y-2 sm:space-y-3">
                        {attachments.map((url, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-xs text-gray-600 truncate max-w-[120px] sm:max-w-[150px]">
                                {url.split("/").pop()}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-3 sm:p-4 text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Resume or Portfolio
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {submitProposal.isError && (
                      <div className="bg-red-50 border border-red-100 rounded-lg sm:rounded-xl p-3 sm:p-4 text-red-700 text-xs sm:text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {submitProposal.error instanceof Error
                            ? submitProposal.error.message
                            : "Failed to submit proposal"}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm sm:text-base"
                        disabled={submitProposal.isPending}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitProposal.isPending || isUploading}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
                      >
                        {submitProposal.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Proposal
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>

              {/* Quick Tips - Mobile */}
              <div className="lg:hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Application Tips
                  </h4>
                  <ul className="text-blue-700 text-xs space-y-1.5">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                      <span>Be specific about your approach to the job</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                      <span>Include relevant portfolio samples</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1" />
                      <span>Respond promptly to client messages</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Gallery Modal */}
      {showImageGallery && job.images && job.images.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowImageGallery(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full max-w-4xl">
            <img
              src={job.images[selectedImageIndex]}
              alt={`Job image ${selectedImageIndex + 1}`}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            />

            <div className="mt-4 flex overflow-x-auto gap-2 no-scrollbar">
              {job.images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                    selectedImageIndex === index
                      ? "border-emerald-500"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default JobDetailPage;
