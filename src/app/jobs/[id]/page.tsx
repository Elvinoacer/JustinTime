"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { toast } from "sonner";
import { useJob, useSubmitProposal } from "@/lib/api/hooks/useJobs";
import { useProviderProfile } from "@/lib/api/hooks/useProvider";
import apiClient from "@/lib/api/client";

const JobDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const jobId = params.id as string;

  const [coverLetter, setCoverLetter] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]); // Keep attachments state for now, as it's used in handleSubmit
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [useProfile, setUseProfile] = useState(false);
  
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
    } else if (!useProfile) {
      // Clear fields when toggling off (optional - you can remove this if you want to keep the values)
      setCoverLetter("");
      setProposedPrice("");
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

    submitProposal.mutate({
      jobId,
      coverLetter,
      price,
      estimatedDays: days,
    }, {
      onSuccess: () => {
        setCoverLetter("");
        setProposedPrice("");
        setEstimatedDays("");
        setAttachments([]);
        setShowForm(false);
        toast.success("Proposal submitted successfully!");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to submit proposal");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-6">The job you're looking for doesn't exist.</p>
            <Link href="/jobs" className="text-emerald-600 hover:text-emerald-700 font-semibold">
              ← Back to Jobs
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isMaxApplicantsReached = job.maxApplicants && (job._count?.proposals || 0) >= job.maxApplicants;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-12 pt-24">
        <Link href="/jobs" className="text-emerald-600 hover:text-emerald-700 font-semibold mb-6 inline-block">
          ← Back to Jobs
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">category</span>
                      {job.category?.name || "General"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      Posted {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {job.budget && (
                  <div className="bg-emerald-50 px-6 py-3 rounded-xl">
                    <p className="text-sm text-emerald-600 font-medium">Budget</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      Kes {job.budget.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                {job.location && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <span className="material-symbols-outlined text-base">location_on</span>
                    {job.location}
                  </span>
                )}
                {job.deadline && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <span className="material-symbols-outlined text-base">event</span>
                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                  </span>
                )}
                <span className="flex items-center gap-1 text-gray-600">
                  <span className="material-symbols-outlined text-base">description</span>
                  {job._count?.proposals || 0} {job.maxApplicants ? `/ ${job.maxApplicants}` : ""} proposals
                </span>
              </div>
            </motion.div>

            {/* Job Description */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </motion.div>

            {/* Images */}
            {job.images && job.images.length > 0 && (
              <motion.div
                className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Attachments</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {job.images.map((image: string, index: number) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Job attachment ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">About the Client</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                  {job.client?.image ? (
                    <img
                      src={job.client.image}
                      alt={job.client.name || "Client"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold text-xl">
                      {job.client?.name?.[0] || "?"}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{job.client?.name || "Anonymous"}</p>
                  <p className="text-sm text-gray-600">Client</p>
                </div>
              </div>
            </motion.div>

            {/* Apply Section */}
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Submit Proposal</h3>
              
              {isMaxApplicantsReached ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined">lock</span>
                    <span className="font-bold">Applications Closed</span>
                  </div>
                  <p className="text-sm">
                    This job has reached its maximum number of applicants ({job.maxApplicants}). 
                    The client is currently reviewing the existing proposals.
                  </p>
                </div>
              ) : !showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg"
                >
                  Apply for this Job
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Use Profile Toggle */}
                  {session?.user?.role === "PROVIDER" && profile && (profile.bio || profile.hourlyRate) && (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label htmlFor="useProfile" className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            id="useProfile"
                            checked={useProfile}
                            onChange={(e) => setUseProfile(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm font-semibold text-gray-900">Use My Profile Information</span>
                        </label>
                      </div>
                      
                      {useProfile && (
                        <div className="mt-3 pt-3 border-t border-emerald-200 space-y-2">
                          {profile.bio && (
                            <div>
                              <p className="text-xs font-medium text-emerald-700 mb-1">Bio Preview:</p>
                              <p className="text-sm text-gray-700 line-clamp-2">{profile.bio}</p>
                            </div>
                          )}
                          {profile.skills && profile.skills.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-emerald-700 mb-1">Skills:</p>
                              <div className="flex flex-wrap gap-1">
                                {profile.skills.slice(0, 5).map((skill: string, idx: number) => (
                                  <span key={idx} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                                    {skill}
                                  </span>
                                ))}
                                {profile.skills.length > 5 && (
                                  <span className="text-xs text-emerald-600">+{profile.skills.length - 5} more</span>
                                )}
                              </div>
                            </div>
                          )}
                          {profile.hourlyRate && (
                            <div>
                              <p className="text-xs font-medium text-emerald-700">Hourly Rate: Kes {Number(profile.hourlyRate).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Letter *
                    </label>
                    <textarea
                      id="coverLetter"
                      required
                      rows={6}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"
                      placeholder="Explain why you're the best fit for this job..."
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">{coverLetter.length} / 50 characters min</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="proposedPrice" className="block text-sm font-medium text-gray-700 mb-2">
                        Price (Kes) *
                      </label>
                      <input
                        type="number"
                        id="proposedPrice"
                        required
                        min="0"
                        step="0.01"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label htmlFor="estimatedDays" className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        id="estimatedDays"
                        min="1"
                        step="1"
                        value={estimatedDays}
                        onChange={(e) => setEstimatedDays(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                        placeholder="e.g. 7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments
                    </label>
                    <div className="space-y-3">
                      {attachments.map((url, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="material-symbols-outlined text-gray-500">description</span>
                            <span className="text-sm text-gray-600 truncate max-w-[150px]">
                              {url.split('/').pop()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
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
                        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
                      >
                        {isUploading ? (
                          <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined">upload_file</span>
                            Upload Resume or Portfolio
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {submitProposal.isError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-700 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined">error</span>
                        {submitProposal.error instanceof Error ? submitProposal.error.message : "Failed to submit proposal"}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                      disabled={submitProposal.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitProposal.isPending || isUploading}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submitProposal.isPending ? "Submitting..." : "Submit Proposal"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default JobDetailPage;

