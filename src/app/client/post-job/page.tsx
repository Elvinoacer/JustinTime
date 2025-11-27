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

// Steps configuration
const steps = [
  { id: 1, title: "Basics", icon: "edit", description: "Title & Category" },
  { id: 2, title: "Details", icon: "description", description: "Description & Photos" },
  { id: 3, title: "Preferences", icon: "tune", description: "Budget & Location" },
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

function PostJobPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const editJobId = searchParams.get("edit");
  const isEditMode = !!editJobId;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    budget: "",
    location: "",
    date: "",
    maxApplicants: "",
  });
  
  // Improved image upload tracking
  type UploadingFile = {
    file: File;
    preview: string;
    progress: number;
    publicId?: string;
  };
  
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<Array<{ url: string; publicId: string }>>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stepRef = useRef<HTMLDivElement>(null);
  
  const createJobMutation = useCreateJob();

  // Fetch categories from database
  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get("/categories");
      // Filter out the "all" category for the post job form
      // API response is { success: true, data: [...] }, so we access response.data.data
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
    mutationFn: async (data: any) => {
      await apiClient.put(`/jobs/${editJobId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", editJobId] });
      setShowSuccessToast(true);
      setTimeout(() => router.push("/client/dashboard"), 2000);
    },
  });

  // Prefill form data when existing job loads
  useEffect(() => {
    if (existingJob) {
      setFormData({
        title: existingJob.title || "",
        category: existingJob.category?.slug || existingJob.categoryId || "",
        description: existingJob.description || "",
        budget: existingJob.budget?.toString() || "",
        location: existingJob.location || "",
        date: "",
        maxApplicants: existingJob.maxApplicants?.toString() || "",
      });
      // Prefill images if they exist
      if (existingJob.images && existingJob.images.length > 0) {
        // For existing images, we don't have publicId, so we'll use URL as fallback
        setUploadedImages(existingJob.images.map((url: string) => ({ url, publicId: "" })));
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

    // Create preview objects for each file
    const newFiles: UploadingFile[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const fileObj = newFiles[i];
      try {
        const formData = new FormData();
        formData.append('file', fileObj.file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();

        // Update progress to 100%
        setUploadingFiles(prev => 
          prev.map((f, idx) => 
            f.preview === fileObj.preview ? { ...f, progress: 100, publicId: data.publicId } : f
          )
        );

        // Move to uploaded images after a brief delay
        setTimeout(() => {
          setUploadedImages(prev => [...prev, { url: data.url, publicId: data.publicId }]);
          setUploadingFiles(prev => prev.filter(f => f.preview !== fileObj.preview));
          URL.revokeObjectURL(fileObj.preview);
        }, 500);

      } catch (error) {
        console.error('Image upload failed:', error);
        setUploadingFiles(prev => prev.filter(f => f.preview !== fileObj.preview));
        URL.revokeObjectURL(fileObj.preview);
      }
    }
  };

  // Remove uploaded image (and delete from Cloudinary)
  const removeImage = async (index: number) => {
    const image = uploadedImages[index];
    if (image.publicId) {
      try {
        await fetch(`/api/upload?publicId=${image.publicId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
      }
    }
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
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
        // Manually validate budget as string first, then schema will validate number
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
        // Schema validation for other constraints
        if (isValid) {
             createJobSchema.pick({ budget: true, location: true, maxApplicants: true }).parse({
            budget: Number(formData.budget),
            location: formData.location,
            maxApplicants: formData.maxApplicants ? Number(formData.maxApplicants) : undefined,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user types
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

  // Placeholder for full form validation, assuming it will be implemented
  const validateForm = (): boolean => {
    let isValid = true;
    // You would typically validate all steps here or the final form data
    // For now, let's just ensure all steps are valid
    for (let i = 1; i <= steps.length; i++) {
      if (!validateStep(i)) {
        isValid = false;
        // Optionally, navigate to the first invalid step
        setCurrentStep(i);
        break;
      }
    }
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const jobData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget: Number(formData.budget),
        location: formData.location,
        images: uploadedImages.map(img => img.url), // Extract URLs only
        maxApplicants: formData.maxApplicants ? Number(formData.maxApplicants) : undefined,
      };

      if (isEditMode) {
        // Update existing job
        await updateJobMutation.mutateAsync(jobData);
      } else {
        // Create new job
        await createJobMutation.mutateAsync(jobData);
        setShowSuccessToast(true);
        setTimeout(() => router.push("/client/dashboard"), 2000);
      }
    } catch (error) {
      console.error("Failed to submit job:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-3"
          >
            <span className="material-symbols-outlined">check_circle</span>
            <div>
              <p className="font-semibold">Job {isEditMode ? 'updated' : 'created'} successfully!</p>
              <p className="text-sm text-emerald-100">Redirecting to dashboard...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900">{isEditMode ? "Edit Job" : "Post a New Job"}</h1>
        <p className="mt-2 text-gray-600">{isEditMode ? "Update your job details below." : "Tell us what you need done, and we'll connect you with the best pros."}</p>
      </div>

      {/* Enhanced Progress Steps */}
      <nav aria-label="Progress" className="mb-12">
        <ol role="list" className="overflow-hidden rounded-md lg:flex lg:border-l lg:border-r lg:border-gray-200 lg:rounded-none border-gray-200">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className="relative overflow-hidden lg:flex-1">
              <div
                className={`border-b border-gray-200 overflow-hidden lg:border-b-0 ${
                  stepIdx === steps.length - 1 ? "" : "lg:border-r"
                }`}
              >
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className="group w-full"
                  aria-current={step.id === currentStep ? "step" : undefined}
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
                  <span className="flex items-start px-6 py-5 text-sm font-medium">
                    <span className="flex-shrink-0">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                          step.id < currentStep
                            ? "border-emerald-600 bg-emerald-600"
                            : step.id === currentStep
                            ? "border-emerald-600"
                            : "border-gray-300"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined ${
                            step.id < currentStep ? "text-white" : step.id === currentStep ? "text-emerald-600" : "text-gray-500"
                          }`}
                        >
                          {step.id < currentStep ? "check" : step.icon}
                        </span>
                      </span>
                    </span>
                    <span className="ml-4 mt-0.5 flex min-w-0 flex-col text-left">
                      <span
                        className={`text-sm font-bold tracking-wide uppercase ${
                          step.id <= currentStep ? "text-emerald-600" : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="text-sm text-gray-500 hidden sm:block">{step.description}</span>
                    </span>
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 focus:outline-none"
              tabIndex={-1}
              ref={stepRef}
            >
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Let's start with the basics</h2>
                    <p className="text-gray-500 text-sm">Give your job a clear title and category.</p>
                  </div>
                  
                  <div>
                    <label htmlFor="title" className="block text-sm font-bold text-gray-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={formData.title}
                      onChange={handleChange}
                      aria-invalid={!!errors.title}
                      aria-describedby={errors.title ? "title-error" : undefined}
                      className={`w-full px-4 py-3 rounded-xl border text-gray-900 ${
                        errors.title ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                      } focus:ring-2 transition-shadow`}
                      placeholder="e.g. Fix leaking faucet in kitchen"
                    />
                    {errors.title && (
                      <p id="title-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <CategorySelector
                      categories={categoriesData}
                      selectedIds={formData.category ? [formData.category] : []}
                      onToggle={(id) => handleCategorySelect(id)}
                      isLoading={isLoadingCategories}
                      error={errors.category}
                      label="Category"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Describe the job</h2>
                    <p className="text-gray-500 text-sm">The more details you provide, the better proposals you'll get.</p>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={6}
                      value={formData.description}
                      onChange={handleChange}
                      aria-invalid={!!errors.description}
                      aria-describedby={errors.description ? "description-error" : undefined}
                      className={`w-full px-4 py-3 rounded-xl border text-gray-900 ${
                        errors.description ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                      } focus:ring-2 transition-shadow`}
                      placeholder="Describe the issue, specific requirements, measurements, etc..."
                    />
                    {errors.description && (
                      <p id="description-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Photos (Optional)
                    </label>
                    <p className="text-sm text-gray-500 mb-4">Add photos to help professionals understand the job better.</p>
                    
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors">
                      <input
                        type="file"
                        id="images"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label htmlFor="images" className="cursor-pointer">
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">cloud_upload</span>
                        <p className="text-sm font-medium text-gray-700">
                          {uploadingFiles.length > 0 ? 'Uploading...' : 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                      </label>
                    </div>

                    {/* Uploading Progress */}
                    {uploadingFiles.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm font-medium text-gray-700">Uploading...</p>
                        {uploadingFiles.map((file, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={file.preview}
                                alt={file.file.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.file.name}</p>
                                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-emerald-600 h-2 rounded-full transition-all"
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
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">{uploadedImages.length} photo(s) uploaded</p>
                        <div className="grid grid-cols-3 gap-4">
                          {uploadedImages.map((image, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                              <img
                                src={image.url}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
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
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Budget & Location</h2>
                    <p className="text-gray-500 text-sm">Help pros understand your constraints.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="budget" className="block text-sm font-bold text-gray-700 mb-2">
                        Estimated Budget (KES) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 font-medium">KES</span>
                        </span>
                        <input
                          type="number"
                          name="budget"
                          id="budget"
                          value={formData.budget}
                          onChange={handleChange}
                          aria-invalid={!!errors.budget}
                          aria-describedby={errors.budget ? "budget-error" : undefined}
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border text-gray-900 ${
                            errors.budget ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                          } focus:ring-2 transition-shadow`}
                          placeholder="e.g. 5000"
                        />
                      </div>
                      {errors.budget && (
                        <p id="budget-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">error</span>
                          {errors.budget}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="date" className="block text-sm font-bold text-gray-700 mb-2">
                        Preferred Date (Optional)
                      </label>
                      <input
                        type="date"
                        name="date"
                        id="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="maxApplicants" className="block text-sm font-bold text-gray-700 mb-2">
                      Max Applicants (Optional)
                    </label>
                    <p className="text-sm text-gray-500 mb-2">Limit the number of proposals you receive.</p>
                    <input
                      type="number"
                      name="maxApplicants"
                      id="maxApplicants"
                      min="1"
                      value={formData.maxApplicants}
                      onChange={handleChange}
                      aria-invalid={!!errors.maxApplicants}
                      aria-describedby={errors.maxApplicants ? "maxApplicants-error" : undefined}
                      className={`w-full px-4 py-3 rounded-xl border text-gray-900 ${
                        errors.maxApplicants ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                      } focus:ring-2 transition-shadow`}
                      placeholder="e.g. 10"
                    />
                    {errors.maxApplicants && (
                      <p id="maxApplicants-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {errors.maxApplicants}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-bold text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-400">location_on</span>
                      </span>
                      <input
                        type="text"
                        name="location"
                        id="location"
                        value={formData.location}
                        onChange={handleChange}
                        aria-invalid={!!errors.location}
                        aria-describedby={errors.location ? "location-error" : undefined}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-gray-900 ${
                          errors.location ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
                        } focus:ring-2 transition-shadow`}
                        placeholder="e.g. Westlands, Nairobi"
                      />
                    </div>
                    {errors.location && (
                      <p id="location-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Post</h2>
                    <p className="text-gray-500 text-sm">Review your job details before posting.</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 space-y-6 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Job Title</h3>
                        <p className="text-lg font-bold text-gray-900">{formData.title}</p>
                      </div>
                      <button onClick={() => setCurrentStep(1)} className="text-emerald-600 text-sm font-medium hover:underline">Edit</button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</h3>
                        <div className="flex items-center gap-2">
                          {categoriesData.find((c: Category) => c.id === formData.category)?.image ? (
                            <img
                              src={categoriesData.find((c: Category) => c.id === formData.category)?.image}
                              alt="Category"
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-gray-600 text-lg">
                              {categoriesData.find((c: Category) => c.id === formData.category)?.icon}
                            </span>
                          )}
                          <p className="text-base text-gray-900 capitalize">
                            {categoriesData.find((c: Category) => c.id === formData.category)?.name}
                          </p>
                        </div>
                      </div>
                      <div>
                         <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Budget</h3>
                         <p className="text-base text-emerald-600 font-bold">KES {formData.budget}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</h3>
                      <p className="text-base text-gray-600 whitespace-pre-wrap">{formData.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Location</h3>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-lg">location_on</span>
                          <p className="text-base text-gray-900">{formData.location}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-lg">calendar_today</span>
                          <p className="text-base text-gray-900">{formData.date || "Flexible"}</p>
                        </div>
                      </div>
                      {formData.maxApplicants && (
                        <div>
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Max Applicants</h3>
                          <p className="text-base text-gray-900">{formData.maxApplicants}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex justify-between pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-2.5 rounded-xl font-medium transition-colors ${
                currentStep === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Back
            </button>
            <button
              onClick={currentStep === steps.length ? handleSubmit : handleNext}
              disabled={createJobMutation.isPending}
              className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createJobMutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Posting...
                </>
              ) : (
                currentStep === steps.length ? "Post Job Now" : "Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>
      <PostJobPageContent />
    </Suspense>
  );
}
