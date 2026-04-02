"use client";
import React, { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { createJobSchema } from "@/lib/validations/schemas";
import { useCreateJob } from "@/lib/api/hooks/useJobs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import CategorySelector from "@/components/CategorySelector";
import { useJobsEvents } from "@/hooks/useJobsEvents";
import { useLocation } from "@/app/onboarding/hooks/useLocation";

// Steps configuration
const steps = [
  { id: 1, title: "Basics", icon: "edit", description: "Title & Category" },
  {
    id: 2,
    title: "Details",
    icon: "description",
    description: "Description & Photos",
  },
  {
    id: 3,
    title: "Preferences",
    icon: "tune",
    description: "Budget & Location",
  },
  { id: 4, title: "Review", icon: "check_circle", description: "Final Check" },
];

// Category type
interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  icon: string;
  count: number;
}

type JobUpsertPayload = {
  title: string;
  category: string;
  description: string;
  budget: number;
  location: string;
  deadline?: string;
  images: string[];
  maxApplicants?: number;
  maxAcceptedProviders?: number;
};

function PostJobPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const editJobId = searchParams.get("edit");
  const isEditMode = !!editJobId;
  const [isMobile, setIsMobile] = useState(false);
  const [postMode, setPostMode] = useState<"full" | "quick">("full");
  const [successMeta, setSuccessMeta] = useState<{
    title: string;
    message: string;
  }>({
    title: `Job ${isEditMode ? "updated" : "created"} successfully!`,
    message: "Redirecting to dashboard...",
  });
  const quickPostEnabled =
    (process.env.NEXT_PUBLIC_FF_QUICK_POST || "").toLowerCase() === "true";
  const isQuickMode = !isEditMode && quickPostEnabled && postMode === "quick";
  const { trackEvent } = useJobsEvents();
  const [didTrackStart, setDidTrackStart] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    budget: "",
    location: "",
    date: "",
    maxApplicants: "",
    maxAcceptedProviders: "",
  });

  // Improved image upload tracking
  type UploadingFile = {
    file: File;
    preview: string;
    progress: number;
    publicId?: string;
  };

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ url: string; publicId: string }>
  >([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [locationFetchError, setLocationFetchError] = useState("");
  const [locationFetchHint, setLocationFetchHint] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stepRef = useRef<HTMLDivElement>(null);
  const hasAutoLocationPrefilledRef = useRef(false);
  const postLocation = useLocation();
  const isFetchingLocation = postLocation.status === "LOADING";

  const createJobMutation = useCreateJob();

  useEffect(() => {
    if (isEditMode || didTrackStart) return;

    trackEvent("job_post_started", {
      userRole: "CLIENT",
      sourcePage: "/client/post-job",
      experimentVariant: isQuickMode ? "quick-post" : "full-post",
    });
    setDidTrackStart(true);
  }, [didTrackStart, isEditMode, isQuickMode, trackEvent]);

  useEffect(() => {
    if (!quickPostEnabled || isEditMode) return;
    const requestedMode = searchParams.get("mode");
    if (requestedMode === "quick") {
      setPostMode("quick");
    }
  }, [isEditMode, quickPostEnabled, searchParams]);

  useEffect(() => {
    if (isEditMode || hasAutoLocationPrefilledRef.current) {
      return;
    }

    hasAutoLocationPrefilledRef.current = true;
    void postLocation.prefillIfPermitted();
  }, [isEditMode, postLocation]);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch categories from database
  const { data: categoriesData = [], isLoading: isLoadingCategories } =
    useQuery({
      queryKey: ["categories"],
      queryFn: async () => {
        const response = await apiClient.get("/categories");
        return response.data.data.filter((cat: Category) => cat.id !== "all");
      },
    });

  // Fetch job data if in edit mode
  const { data: existingJob, isLoading: isLoadingJob } = useQuery({
    queryKey: ["job", editJobId],
    queryFn: async () => {
      const response = await apiClient.get(`/jobs/${editJobId}`);
      return response.data;
    },
    enabled: isEditMode,
  });

  // Update job mutation for edit mode
  const updateJobMutation = useMutation({
    mutationFn: async (data: JobUpsertPayload) => {
      await apiClient.put(`/jobs/${editJobId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", editJobId] });
      setShowSuccessToast(true);
      setTimeout(() => router.push(`/client/jobs/${editJobId}`), 2000);
    },
  });

  // Prefill form data when existing job loads
  useEffect(() => {
    if (existingJob) {
      setFormData({
        title: existingJob.title || "",
        category: existingJob.categoryId || existingJob.category?.id || "",
        description: existingJob.description || "",
        budget: existingJob.budget?.toString() || "",
        location: existingJob.location || "",
        date: existingJob.deadline
          ? new Date(existingJob.deadline).toISOString().split("T")[0]
          : "",
        maxApplicants: existingJob.maxApplicants?.toString() || "",
        maxAcceptedProviders:
          existingJob.maxAcceptedProviders?.toString() || "",
      });
      // Prefill images if they exist
      if (existingJob.images && existingJob.images.length > 0) {
        setUploadedImages(
          existingJob.images.map((url: string) => ({ url, publicId: "" })),
        );
      }
    }
  }, [existingJob]);

  // Focus management when step changes
  useEffect(() => {
    if (stepRef.current) {
      stepRef.current.focus();
    }
  }, [currentStep]);

  // Improved image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadingFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);

    for (let i = 0; i < newFiles.length; i++) {
      const fileObj = newFiles[i];
      try {
        const formData = new FormData();
        formData.append("file", fileObj.file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.preview === fileObj.preview
              ? { ...f, progress: 100, publicId: data.publicId }
              : f,
          ),
        );

        setTimeout(() => {
          setUploadedImages((prev) => [
            ...prev,
            { url: data.url, publicId: data.publicId },
          ]);
          setUploadingFiles((prev) =>
            prev.filter((f) => f.preview !== fileObj.preview),
          );
          URL.revokeObjectURL(fileObj.preview);
        }, 500);
      } catch (error) {
        console.error("Image upload failed:", error);
        setUploadingFiles((prev) =>
          prev.filter((f) => f.preview !== fileObj.preview),
        );
        URL.revokeObjectURL(fileObj.preview);
      }
    }
  };

  // Remove uploaded image
  const removeImage = async (index: number) => {
    const image = uploadedImages[index];
    if (image.publicId) {
      try {
        await fetch(`/api/upload?publicId=${image.publicId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
      }
    }
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    try {
      if (step === 1) {
        createJobSchema.pick({ title: true, category: true }).parse({
          title: formData.title,
          category: formData.category,
        });
      } else if (step === 2) {
        createJobSchema.pick({ description: true }).parse({
          description: formData.description,
        });
      } else if (step === 3) {
        if (!formData.budget || isNaN(Number(formData.budget))) {
          newErrors.budget = "Please enter a valid budget amount";
          isValid = false;
        }
        if (!formData.location) {
          newErrors.location = "Location is required";
          isValid = false;
        }
        if (formData.maxApplicants && isNaN(Number(formData.maxApplicants))) {
          newErrors.maxApplicants = "Please enter a valid number";
          isValid = false;
        }
        if (
          formData.maxAcceptedProviders &&
          isNaN(Number(formData.maxAcceptedProviders))
        ) {
          newErrors.maxAcceptedProviders = "Please enter a valid number";
          isValid = false;
        }
        if (
          formData.maxApplicants &&
          formData.maxAcceptedProviders &&
          Number(formData.maxAcceptedProviders) > Number(formData.maxApplicants)
        ) {
          newErrors.maxAcceptedProviders =
            "Accepted providers limit cannot exceed max applicants";
          isValid = false;
        }
        if (isValid) {
          createJobSchema
            .pick({
              budget: true,
              location: true,
              maxApplicants: true,
              maxAcceptedProviders: true,
            })
            .parse({
              budget: Number(formData.budget),
              location: formData.location,
              maxApplicants: formData.maxApplicants
                ? Number(formData.maxApplicants)
                : undefined,
              maxAcceptedProviders: formData.maxAcceptedProviders
                ? Number(formData.maxAcceptedProviders)
                : undefined,
            });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === "location") {
      postLocation.setManualAddress(value);
      if (locationFetchHint) {
        setLocationFetchHint("");
      }
    }
    if (name === "location" && locationFetchError) {
      setLocationFetchError("");
    }
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData({ ...formData, category: categoryId });
    if (errors.category) {
      setErrors({ ...errors, category: "" });
    }
  };

  const handleUseCurrentLocation = async () => {
    setLocationFetchError("");
    try {
      await postLocation.getLocation();
    } catch (error) {
      setLocationFetchError(
        error instanceof Error
          ? error.message
          : "Unable to detect your current location",
      );
    }
  };

  useEffect(() => {
    if (postLocation.status !== "SUCCESS") return;

    const detectedAddress = postLocation.location.address.trim();
    if (!detectedAddress) return;

    setFormData((prev) =>
      prev.location === detectedAddress
        ? prev
        : { ...prev, location: detectedAddress },
    );

    if (postLocation.location.source === "IP") {
      setLocationFetchHint(
        "Approximate location detected from your network. Edit the address to your exact area if needed.",
      );
    } else if (
      postLocation.location.source === "GPS" &&
      postLocation.location.accuracy != null &&
      postLocation.location.accuracy > 400
    ) {
      setLocationFetchHint(
        `GPS location is approximate (about +/- ${Math.round(postLocation.location.accuracy)}m). You can refine it manually.`,
      );
    } else {
      setLocationFetchHint("");
    }

    setErrors((prev) => (prev.location ? { ...prev, location: "" } : prev));
    setLocationFetchError("");
  }, [
    postLocation.location.accuracy,
    postLocation.location.address,
    postLocation.location.source,
    postLocation.status,
  ]);

  useEffect(() => {
    if (postLocation.status !== "FAILED") return;
    setLocationFetchHint("");
    setLocationFetchError(
      "Unable to detect your current location. Please enter location manually.",
    );
  }, [postLocation.status]);

  const validateForm = (): boolean => {
    let isValid = true;
    for (let i = 1; i <= steps.length; i++) {
      if (!validateStep(i)) {
        isValid = false;
        setCurrentStep(i);
        break;
      }
    }
    return isValid;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (isQuickMode) {
      const quickErrors: Record<string, string> = {};
      if (!formData.title || formData.title.trim().length < 5) {
        quickErrors.title = "Title must be at least 5 characters";
      }
      if (!formData.budget || Number.isNaN(Number(formData.budget))) {
        quickErrors.budget = "Please enter a valid budget amount";
      } else if (Number(formData.budget) <= 0) {
        quickErrors.budget = "Budget must be positive";
      }
      if (!formData.location || !formData.location.trim()) {
        quickErrors.location = "Location is required";
      }

      if (Object.keys(quickErrors).length > 0) {
        setErrors(quickErrors);
        return;
      }

      try {
        const quickJob = await createJobMutation.mutateAsync({
          mode: "quick",
          title: formData.title.trim(),
          budget: Number(formData.budget),
          location: formData.location.trim(),
        });

        trackEvent("job_post_minimal_submitted", {
          userRole: "CLIENT",
          sourcePage: "/client/post-job",
          experimentVariant: "quick-post",
          jobId: quickJob?.id,
        });

        setSuccessMeta({
          title: "Your job is live!",
          message: "Add details now to get better proposals.",
        });
        setShowSuccessToast(true);

        setTimeout(() => {
          if (quickJob?.id) {
            router.push(`/client/post-job?edit=${quickJob.id}`);
          } else {
            router.push("/client/dashboard");
          }
        }, 2000);
      } catch (error) {
        console.error("Failed to submit quick job:", error);
        setSubmitError("Failed to submit quick job. Please try again.");
      }
      return;
    }

    if (!validateForm()) return;

    try {
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget: Number(formData.budget),
        location: formData.location,
        deadline: formData.date || undefined,
        images: uploadedImages.map((img) => img.url),
        maxApplicants: formData.maxApplicants
          ? Number(formData.maxApplicants)
          : undefined,
        maxAcceptedProviders: formData.maxAcceptedProviders
          ? Number(formData.maxAcceptedProviders)
          : undefined,
      };

      if (isEditMode) {
        await updateJobMutation.mutateAsync(jobData);
      } else {
        const created = await createJobMutation.mutateAsync(jobData);
        trackEvent("job_post_published", {
          userRole: "CLIENT",
          sourcePage: "/client/post-job",
          experimentVariant: "full-post",
          jobId: created?.id,
        });
        setSuccessMeta({
          title: "Job created successfully!",
          message: "Redirecting to dashboard...",
        });
        setShowSuccessToast(true);
        setTimeout(() => router.push("/client/dashboard"), 2000);
      }
    } catch (error) {
      console.error("Failed to submit job:", error);
      setSubmitError("Failed to submit job. Please try again.");
    }
  };

  const selectedCategory = categoriesData.find(
    (c: Category) => c.id === formData.category,
  );
  const basicsComplete = Boolean(formData.title && formData.category);
  const detailsComplete = Boolean(formData.description);
  const preferencesComplete = Boolean(formData.budget && formData.location);
  const completionCount = [
    basicsComplete,
    detailsComplete,
    preferencesComplete,
  ].filter(Boolean).length;
  const completionPercent = Math.round((completionCount / 3) * 100);

  if (isEditMode && isLoadingJob) {
    return (
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center gap-3 text-gray-600">
          <span className="material-symbols-outlined animate-spin text-emerald-600">
            progress_activity
          </span>
          <p className="text-sm sm:text-base font-medium">
            Loading job details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 py-4 sm:py-8 lg:py-10">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 bg-emerald-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg z-50 flex items-center gap-2 sm:gap-3 max-w-xs sm:max-w-sm"
          >
            <span className="material-symbols-outlined text-sm sm:text-base">
              check_circle
            </span>
            <div>
              <p className="font-semibold text-sm sm:text-base">
                {successMeta.title}
              </p>
              <p className="text-xs text-emerald-100">{successMeta.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 mb-3">
          <span className="material-symbols-outlined text-sm">bolt</span>
          Guided job posting
        </div>
        {!isEditMode && quickPostEnabled && (
          <div className="mb-3 inline-flex rounded-full border border-emerald-100 bg-white p-1">
            <button
              type="button"
              onClick={() => setPostMode("full")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                postMode === "full"
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              Full Post
            </button>
            <button
              type="button"
              onClick={() => setPostMode("quick")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                postMode === "quick"
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              Quick Post
            </button>
          </div>
        )}
        <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          {isEditMode ? "Edit your job" : "Post a new job"}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-3xl">
          {isEditMode
            ? "Refine your details so professionals can send better proposals."
            : isQuickMode
              ? "Post in under a minute with title, budget, and location."
              : "Use this guided flow to describe your work clearly and get quality proposals faster."}
        </p>
      </div>

      {isQuickMode && (
        <div className="max-w-3xl rounded-2xl border border-emerald-100 bg-white p-5 sm:p-6 shadow-sm mb-6">
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <h2 className="text-lg font-bold text-gray-900 mb-1">Quick Post</h2>
          <p className="text-sm text-gray-600 mb-4">
            Publish now, then enrich details to attract better proposals.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                placeholder="e.g. Fix leaking kitchen sink"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Budget (KES)
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                  placeholder="5000"
                />
                {errors.budget && (
                  <p className="mt-1 text-xs text-red-600">{errors.budget}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Location
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isFetchingLocation}
                  className="mb-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-base">
                    near_me
                  </span>
                  {isFetchingLocation
                    ? "Detecting your location..."
                    : "Use My Current Location"}
                </button>
                <p className="mb-2 text-xs text-gray-500">
                  Tap once to auto-fill your current address.
                </p>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                  placeholder="Westlands, Nairobi"
                />
                {errors.location && (
                  <p className="mt-1 text-xs text-red-600">{errors.location}</p>
                )}
                {locationFetchError && (
                  <p className="mt-1 text-xs text-red-600">
                    {locationFetchError}
                  </p>
                )}
                {!locationFetchError && locationFetchHint && (
                  <p className="mt-1 text-xs text-amber-700">
                    {locationFetchHint}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={createJobMutation.isPending}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {createJobMutation.isPending ? "Posting..." : "Post Job Now"}
            </button>
          </div>
        </div>
      )}

      {!isQuickMode && (
        <>
          {submitError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {/* Mobile Progress Steps (Simplified) */}
          {isMobile && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`p-2 rounded-lg ${
                    currentStep === 1
                      ? "text-gray-300"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="text-center">
                  <span className="text-sm font-bold text-gray-900">
                    Step {currentStep} of {steps.length}
                  </span>
                  <p className="text-xs text-gray-500">
                    {steps[currentStep - 1]?.title}
                  </p>
                </div>
                <div className="w-10"></div>
              </div>

              <div className="flex gap-1 mb-4">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`h-1 flex-1 rounded-full ${
                      step.id < currentStep
                        ? "bg-emerald-600"
                        : step.id === currentStep
                          ? "bg-emerald-400"
                          : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Desktop Progress Steps */}
          {!isMobile && (
            <nav aria-label="Progress" className="mb-8 lg:mb-12">
              <ol
                role="list"
                className="overflow-hidden rounded-md lg:flex lg:border-l lg:border-r lg:border-gray-200 lg:rounded-none border-gray-200"
              >
                {steps.map((step, stepIdx) => (
                  <li
                    key={step.id}
                    className="relative overflow-hidden lg:flex-1"
                  >
                    <div
                      className={`border-b border-gray-200 overflow-hidden lg:border-b-0 ${
                        stepIdx === steps.length - 1 ? "" : "lg:border-r"
                      }`}
                    >
                      <button
                        onClick={() =>
                          step.id < currentStep && setCurrentStep(step.id)
                        }
                        disabled={step.id > currentStep}
                        className="group w-full"
                        aria-current={
                          step.id === currentStep ? "step" : undefined
                        }
                      >
                        <span
                          className={`absolute top-0 left-0 h-full w-1 bg-transparent group-hover:bg-gray-200 lg:bottom-0 lg:top-auto lg:h-1 lg:w-full ${
                            step.id < currentStep
                              ? "bg-emerald-600"
                              : step.id === currentStep
                                ? "bg-emerald-600"
                                : ""
                          }`}
                          aria-hidden="true"
                        />
                        <span className="flex items-start px-4 sm:px-6 py-4 text-sm font-medium">
                          <span className="shrink-0">
                            <span
                              className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 ${
                                step.id < currentStep
                                  ? "border-emerald-600 bg-emerald-600"
                                  : step.id === currentStep
                                    ? "border-emerald-600"
                                    : "border-gray-300"
                              }`}
                            >
                              <span
                                className={`material-symbols-outlined text-sm sm:text-base ${
                                  step.id < currentStep
                                    ? "text-white"
                                    : step.id === currentStep
                                      ? "text-emerald-600"
                                      : "text-gray-500"
                                }`}
                              >
                                {step.id < currentStep ? "check" : step.icon}
                              </span>
                            </span>
                          </span>
                          <span className="ml-3 mt-0.5 flex min-w-0 flex-col text-left">
                            <span
                              className={`text-xs sm:text-sm font-bold tracking-wide uppercase ${
                                step.id <= currentStep
                                  ? "text-emerald-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {step.title}
                            </span>
                            <span className="text-xs text-gray-500">
                              {step.description}
                            </span>
                          </span>
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 sm:gap-6">
            <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xs sm:shadow-md lg:shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 lg:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 sm:space-y-6 focus:outline-none"
                    tabIndex={-1}
                    ref={stepRef}
                  >
                    {currentStep === 1 && (
                      <div className="space-y-4 sm:space-y-6">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                            Let&apos;s start with the basics
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Give professionals immediate context about the work.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                          <div className="lg:col-span-7">
                            <label
                              htmlFor="title"
                              className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                            >
                              Job Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="title"
                              id="title"
                              value={formData.title}
                              onChange={handleChange}
                              aria-invalid={!!errors.title}
                              aria-describedby={
                                errors.title ? "title-error" : undefined
                              }
                              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                                errors.title
                                  ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              } transition-shadow`}
                              placeholder="e.g. Fix leaking kitchen sink and replace tap"
                            />
                            <p className="mt-1.5 text-xs text-gray-500">
                              Tip: Start with a verb and include the exact area
                              to reduce back-and-forth.
                            </p>
                            {errors.title && (
                              <p
                                id="title-error"
                                className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">
                                  error
                                </span>
                                {errors.title}
                              </p>
                            )}
                          </div>

                          <div className="lg:col-span-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 sm:p-4">
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                              Strong title example
                            </p>
                            <p className="text-sm text-emerald-900 mt-1">
                              Install 3 ceiling lights in living room and
                              hallway
                            </p>
                            <p className="text-xs text-emerald-700 mt-2">
                              Good titles get better matches and faster
                              responses.
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <label className="block text-sm font-bold text-gray-700">
                              Category <span className="text-red-500">*</span>
                            </label>
                            {selectedCategory && (
                              <span className="text-[11px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                                Selected: {selectedCategory.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-3">
                            Pick the closest service type so your job reaches
                            the right professionals.
                          </p>
                          <CategorySelector
                            categories={categoriesData}
                            selectedIds={
                              formData.category ? [formData.category] : []
                            }
                            onToggle={(id) => handleCategorySelect(id)}
                            isLoading={isLoadingCategories}
                            error={errors.category}
                            label="Category"
                            compact={isMobile}
                          />
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-4 sm:space-y-6">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                            Describe the job
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Include scope, expected outcome, and any
                            constraints.
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <label
                              htmlFor="description"
                              className="block text-sm font-bold text-gray-700"
                            >
                              Description{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <span className="text-xs text-gray-500">
                              {formData.description.length} characters
                            </span>
                          </div>
                          <textarea
                            id="description"
                            name="description"
                            rows={isMobile ? 4 : 6}
                            value={formData.description}
                            onChange={handleChange}
                            aria-invalid={!!errors.description}
                            aria-describedby={
                              errors.description
                                ? "description-error"
                                : undefined
                            }
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                              errors.description
                                ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            } transition-shadow`}
                            placeholder="What needs to be done, where exactly, and what should the final result look like? Include measurements, materials, access constraints, and urgency."
                          />
                          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                            <li className="rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-2">
                              What is broken or needed
                            </li>
                            <li className="rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-2">
                              Exact location and size
                            </li>
                            <li className="rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-2">
                              Preferred timeline
                            </li>
                          </ul>
                          {errors.description && (
                            <p
                              id="description-error"
                              className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">
                                error
                              </span>
                              {errors.description}
                            </p>
                          )}
                        </div>

                        {/* Image Upload Section */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                            Photos (Optional)
                          </label>
                          <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                            Add photos to help professionals understand the job
                            better.
                          </p>

                          {/* Upload Area */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center hover:border-emerald-400 transition-colors">
                            <input
                              type="file"
                              id="images"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            <label htmlFor="images" className="cursor-pointer">
                              <span className="material-symbols-outlined text-2xl sm:text-3xl lg:text-4xl text-gray-400 mb-1.5 sm:mb-2">
                                cloud_upload
                              </span>
                              <p className="text-xs sm:text-sm font-medium text-gray-700">
                                {uploadingFiles.length > 0
                                  ? "Uploading..."
                                  : "Click to upload or drag and drop"}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                                PNG, JPG, GIF up to 10MB
                              </p>
                            </label>
                          </div>

                          {/* Uploading Progress */}
                          {uploadingFiles.length > 0 && (
                            <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                              <p className="text-xs sm:text-sm font-medium text-gray-700">
                                Uploading...
                              </p>
                              {uploadingFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="border border-gray-200 rounded-lg p-2.5 sm:p-3"
                                >
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <img
                                      src={file.preview}
                                      alt={file.file.name}
                                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded"
                                    />
                                    <div className="flex-1">
                                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                        {file.file.name}
                                      </p>
                                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                                        <div
                                          className="bg-emerald-600 h-1.5 sm:h-2 rounded-full transition-all"
                                          style={{ width: `${file.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Uploaded Images Gallery */}
                          {uploadedImages.length > 0 && (
                            <div className="mt-3 sm:mt-4">
                              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                                {uploadedImages.length} photo(s) uploaded
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                                {uploadedImages.map((image, index) => (
                                  <div
                                    key={index}
                                    className="relative aspect-square rounded-lg overflow-hidden group"
                                  >
                                    <img
                                      src={image.url}
                                      alt={`Upload ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeImage(index)}
                                      className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-red-500 text-white p-0.5 sm:p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Remove image"
                                    >
                                      <span className="material-symbols-outlined text-xs sm:text-sm">
                                        close
                                      </span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-4 sm:space-y-6">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                            Budget & Location
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Help pros understand your constraints.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label
                              htmlFor="budget"
                              className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                            >
                              Estimated Budget (KES){" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 font-medium text-sm">
                                  KES
                                </span>
                              </span>
                              <input
                                type="number"
                                name="budget"
                                id="budget"
                                value={formData.budget}
                                onChange={handleChange}
                                aria-invalid={!!errors.budget}
                                aria-describedby={
                                  errors.budget ? "budget-error" : undefined
                                }
                                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                                  errors.budget
                                    ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                } transition-shadow`}
                                placeholder="e.g. 5000"
                              />
                            </div>
                            {errors.budget && (
                              <p
                                id="budget-error"
                                className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">
                                  error
                                </span>
                                {errors.budget}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="date"
                              className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                            >
                              Preferred Date (Optional)
                            </label>
                            <input
                              type="date"
                              name="date"
                              id="date"
                              value={formData.date}
                              onChange={handleChange}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 text-sm sm:text-base text-gray-900 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="maxApplicants"
                            className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                          >
                            Max Applicants (Optional)
                          </label>
                          <p className="text-xs sm:text-sm text-gray-500 mb-2">
                            Limit the number of proposals you receive.
                          </p>
                          <input
                            type="number"
                            name="maxApplicants"
                            id="maxApplicants"
                            min="1"
                            value={formData.maxApplicants}
                            onChange={handleChange}
                            aria-invalid={!!errors.maxApplicants}
                            aria-describedby={
                              errors.maxApplicants
                                ? "maxApplicants-error"
                                : undefined
                            }
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                              errors.maxApplicants
                                ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            } transition-shadow`}
                            placeholder="e.g. 10"
                          />
                          {errors.maxApplicants && (
                            <p
                              id="maxApplicants-error"
                              className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">
                                error
                              </span>
                              {errors.maxApplicants}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="maxAcceptedProviders"
                            className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2"
                          >
                            Max Providers to Hire (Optional)
                          </label>
                          <p className="text-xs sm:text-sm text-gray-500 mb-2">
                            How many proposals can be accepted before hiring
                            closes.
                          </p>
                          <input
                            type="number"
                            name="maxAcceptedProviders"
                            id="maxAcceptedProviders"
                            min="1"
                            value={formData.maxAcceptedProviders}
                            onChange={handleChange}
                            aria-invalid={!!errors.maxAcceptedProviders}
                            aria-describedby={
                              errors.maxAcceptedProviders
                                ? "maxAcceptedProviders-error"
                                : undefined
                            }
                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                              errors.maxAcceptedProviders
                                ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            } transition-shadow`}
                            placeholder="e.g. 2"
                          />
                          {errors.maxAcceptedProviders && (
                            <p
                              id="maxAcceptedProviders-error"
                              className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">
                                error
                              </span>
                              {errors.maxAcceptedProviders}
                            </p>
                          )}
                        </div>

                        <div>
                          <div className="mb-1.5 sm:mb-2">
                            <label
                              htmlFor="location"
                              className="block text-sm font-bold text-gray-700"
                            >
                              Location <span className="text-red-500">*</span>
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isFetchingLocation}
                            className="mb-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-base">
                              near_me
                            </span>
                            {isFetchingLocation
                              ? "Detecting your location..."
                              : "Use My Current Location"}
                          </button>
                          <p className="mb-2 text-xs sm:text-sm text-gray-500">
                            Fast option: auto-fill where you are now.
                          </p>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="material-symbols-outlined text-gray-400 text-sm">
                                location_on
                              </span>
                            </span>
                            <input
                              type="text"
                              name="location"
                              id="location"
                              value={formData.location}
                              onChange={handleChange}
                              aria-invalid={!!errors.location}
                              aria-describedby={
                                errors.location ? "location-error" : undefined
                              }
                              className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base text-gray-900 ${
                                errors.location
                                  ? "border-red-300 focus:ring-1 sm:focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  : "border-gray-300 focus:ring-1 sm:focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              } transition-shadow`}
                              placeholder="e.g. Westlands, Nairobi"
                            />
                          </div>
                          {errors.location && (
                            <p
                              id="location-error"
                              className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">
                                error
                              </span>
                              {errors.location}
                            </p>
                          )}
                          {locationFetchError && (
                            <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">
                                location_off
                              </span>
                              {locationFetchError}
                            </p>
                          )}
                          {!locationFetchError && locationFetchHint && (
                            <p className="mt-1 text-xs sm:text-sm text-amber-700">
                              {locationFetchHint}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="space-y-4 sm:space-y-6">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                            Review & Post
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Review your job details before posting.
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Job Title
                              </h3>
                              <p className="text-base sm:text-lg font-bold text-gray-900">
                                {formData.title}
                              </p>
                            </div>
                            <button
                              onClick={() => setCurrentStep(1)}
                              className="text-emerald-600 text-xs sm:text-sm font-medium hover:underline whitespace-nowrap ml-2"
                            >
                              Edit
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Category
                              </h3>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                {categoriesData.find(
                                  (c: Category) => c.id === formData.category,
                                )?.image ? (
                                  <img
                                    src={
                                      categoriesData.find(
                                        (c: Category) =>
                                          c.id === formData.category,
                                      )?.image
                                    }
                                    alt="Category"
                                    className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                                  />
                                ) : (
                                  <span className="material-symbols-outlined text-gray-600 text-base">
                                    {
                                      categoriesData.find(
                                        (c: Category) =>
                                          c.id === formData.category,
                                      )?.icon
                                    }
                                  </span>
                                )}
                                <p className="text-sm sm:text-base text-gray-900 capitalize truncate">
                                  {
                                    categoriesData.find(
                                      (c: Category) =>
                                        c.id === formData.category,
                                    )?.name
                                  }
                                </p>
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Budget
                              </h3>
                              <p className="text-base sm:text-lg text-emerald-600 font-bold">
                                KES {formData.budget}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                              Description
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                              {formData.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Location
                              </h3>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-base">
                                  location_on
                                </span>
                                <p className="text-sm sm:text-base text-gray-900 truncate">
                                  {formData.location}
                                </p>
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Date
                              </h3>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-base">
                                  calendar_today
                                </span>
                                <p className="text-sm sm:text-base text-gray-900">
                                  {formData.date || "Flexible"}
                                </p>
                              </div>
                            </div>
                            {formData.maxApplicants && (
                              <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Max Applicants
                                </h3>
                                <p className="text-sm sm:text-base text-gray-900">
                                  {formData.maxApplicants}
                                </p>
                              </div>
                            )}
                            {formData.maxAcceptedProviders && (
                              <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Max Providers To Hire
                                </h3>
                                <p className="text-sm sm:text-base text-gray-900">
                                  {formData.maxAcceptedProviders}
                                </p>
                              </div>
                            )}
                          </div>

                          {uploadedImages.length > 0 && (
                            <div>
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Photos ({uploadedImages.length})
                              </h3>
                              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {uploadedImages
                                  .slice(0, 3)
                                  .map((image, index) => (
                                    <img
                                      key={index}
                                      src={image.url}
                                      alt={`Job photo ${index + 1}`}
                                      className="aspect-square object-cover rounded-lg"
                                    />
                                  ))}
                                {uploadedImages.length > 3 && (
                                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                    <span className="text-xs sm:text-sm font-bold text-gray-600">
                                      +{uploadedImages.length - 3} more
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-6 sm:mt-8 lg:mt-10 flex justify-between pt-4 sm:pt-6 border-t border-gray-100">
                  <button
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-colors text-sm sm:text-base ${
                      currentStep === 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    Back
                  </button>
                  <button
                    onClick={
                      currentStep === steps.length ? handleSubmit : handleNext
                    }
                    disabled={createJobMutation.isPending}
                    className="bg-linear-to-r from-emerald-500 to-emerald-600 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                  >
                    {createJobMutation.isPending ? (
                      <>
                        <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span className="text-xs sm:text-sm">Posting...</span>
                      </>
                    ) : currentStep === steps.length ? (
                      "Post Job Now"
                    ) : (
                      "Continue"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {!isMobile && (
              <aside className="hidden xl:block">
                <div className="sticky top-6 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-900">
                        Completion
                      </h3>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                        {completionPercent}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-linear-to-r from-emerald-500 to-teal-600 transition-all"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-center justify-between">
                        <span className="text-gray-600">Basics</span>
                        <span
                          className={
                            basicsComplete
                              ? "text-emerald-600"
                              : "text-gray-400"
                          }
                        >
                          {basicsComplete ? "Done" : "Pending"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-gray-600">Details</span>
                        <span
                          className={
                            detailsComplete
                              ? "text-emerald-600"
                              : "text-gray-400"
                          }
                        >
                          {detailsComplete ? "Done" : "Pending"}
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-gray-600">Preferences</span>
                        <span
                          className={
                            preferencesComplete
                              ? "text-emerald-600"
                              : "text-gray-400"
                          }
                        >
                          {preferencesComplete ? "Done" : "Pending"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">
                      Live Preview
                    </h3>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Title
                      </p>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {formData.title || "Your job title will appear here"}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide pt-1">
                        Category
                      </p>
                      <p className="text-sm text-gray-800">
                        {selectedCategory?.name || "Not selected"}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide pt-1">
                        Budget
                      </p>
                      <p className="text-sm text-gray-800">
                        {formData.budget ? `KES ${formData.budget}` : "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-amber-900 mb-1">
                      Quality Tip
                    </h3>
                    <p className="text-xs text-amber-800">
                      Jobs with clear title, detailed scope, and realistic
                      budget usually receive better proposals sooner.
                    </p>
                  </div>
                </div>
              </aside>
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          {isMobile && currentStep < steps.length && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg sm:hidden">
              <button
                onClick={
                  currentStep === steps.length ? handleSubmit : handleNext
                }
                disabled={createJobMutation.isPending}
                className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md"
              >
                {createJobMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Posting...
                  </>
                ) : currentStep === steps.length ? (
                  "Post Job Now"
                ) : (
                  `Continue to ${steps[currentStep]?.title}`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-emerald-600"></div>
        </div>
      }
    >
      <PostJobPageContent />
    </Suspense>
  );
}
