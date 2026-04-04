"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import apiClient from "@/lib/api/client";
import {
  useCreateProposalTemplate,
  useDeleteProposalTemplate,
  useJob,
  useJobProposals,
  useProviderTeams,
  useProposalTemplates,
  useSubmitProposal,
  useUpdateProposalTemplate,
} from "@/lib/api/hooks/useJobs";
import { useJobsEvents } from "@/hooks/useJobsEvents";
import {
  buildProposalTemplate,
  type ProposalTemplateKey,
} from "@/lib/proposals/templates";
import { useProviderProfile } from "@/lib/api/hooks/useProvider";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Columns2,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  PenLine,
  Send,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import PaymentTimelineCard from "@/components/jobs/PaymentTimelineCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  parseFulfillmentPreference,
  withFulfillmentPreference,
  type ProposalFulfillmentMode,
} from "@/lib/proposals/fulfillmentMode";
import { hasRole } from "@/lib/auth/roles";

interface BookingTimelineResponse {
  bookingStatus?: string;
  totalAmount?: number;
  payment?: {
    status?: string;
  } | null;
  escrow?: {
    milestones?: Array<{ id: string; status: string; amount?: number }>;
  } | null;
}

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "Flexible";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
      message?: string;
    };

    return (
      maybeError.response?.data?.message ||
      maybeError.response?.data?.error ||
      maybeError.message ||
      "Failed to submit proposal"
    );
  }

  return "Failed to submit proposal";
}

function buildMessagesHref(
  basePath: string,
  partnerId: string,
  partnerName?: string,
  partnerImage?: string | null,
) {
  const params = new URLSearchParams({ partnerId });
  if (partnerName) params.set("partnerName", partnerName);
  if (partnerImage) params.set("partnerImage", partnerImage);
  return `${basePath}?${params.toString()}`;
}

function normalizeWhatsAppPhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const digitsOnly = rawPhone.replace(/\D/g, "");
  return digitsOnly || null;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const jobId = params.id as string;

  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterMode, setCoverLetterMode] = useState<
    "write" | "preview" | "split"
  >("write");
  const [proposedPrice, setProposedPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProposalTemplateKey | null>(null);
  const [selectedSavedTemplateId, setSelectedSavedTemplateId] = useState<
    string | null
  >(null);
  const [templateName, setTemplateName] = useState("");
  const [fulfillmentMode, setFulfillmentMode] =
    useState<ProposalFulfillmentMode>("INDIVIDUAL");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [bookingTimeline, setBookingTimeline] =
    useState<BookingTimelineResponse | null>(null);
  const [useProfile, setUseProfile] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { trackEvent } = useJobsEvents();
  const quickApplyVariant =
    (process.env.NEXT_PUBLIC_FF_QUICK_APPLY_TEMPLATES || "").toLowerCase() ===
    "true"
      ? "quick-apply"
      : "baseline";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverLetterRef = useRef<HTMLTextAreaElement>(null);
  const hasHandledMessageIntentRef = useRef(false);
  const isProvider = hasRole(session?.user, "PROVIDER");
  const prefersDashboardMessages =
    hasRole(session?.user, "PROVIDER") || hasRole(session?.user, "ADMIN");
  const shouldResumeMessageIntent =
    searchParams.get("messageClientInApp") === "1";
  const shouldResumeApplyIntent = searchParams.get("apply") === "1";
  const applyCallbackUrl = encodeURIComponent(`/jobs/${jobId}?apply=1`);

  const { data: job, isLoading, error } = useJob(jobId);
  const { data: profile } = useProviderProfile(
    Boolean(session?.user?.id && isProvider),
  );
  const { data: myProposals } = useJobProposals(
    jobId,
    Boolean(session?.user?.id && isProvider),
  );
  const { data: savedTemplatesData } = useProposalTemplates(
    Boolean(session?.user?.id && isProvider),
  );
  const { data: providerTeamsData } = useProviderTeams(
    Boolean(session?.user?.id && isProvider),
  );
  const createProposalTemplate = useCreateProposalTemplate();
  const updateProposalTemplate = useUpdateProposalTemplate();
  const deleteProposalTemplate = useDeleteProposalTemplate();
  const submitProposal = useSubmitProposal();
  const providerProfile = profile?.data;
  const savedTemplates = savedTemplatesData?.items || [];
  const providerTeams = providerTeamsData?.items || [];

  const existingProposal = myProposals?.[0];
  const existingFulfillmentPreference = parseFulfillmentPreference(
    existingProposal?.attachments,
  );
  const isJobOwner = Boolean(
    session?.user?.id && session.user.id === job?.client?.id,
  );
  const isGuest = authStatus !== "authenticated";
  const isMaxApplicantsReached =
    !!job?.maxApplicants &&
    Number(job?._count?.proposals || 0) >= Number(job.maxApplicants);
  const acceptedProposalsCount = Number(job?.acceptedProposalsCount || 0);
  const effectiveMaxAcceptedProviders = Number(
    job?.effectiveMaxAcceptedProviders || job?.maxAcceptedProviders || 1,
  );
  const isAcceptedProvidersLimitReached =
    acceptedProposalsCount >= effectiveMaxAcceptedProviders;
  const isJobClosed = !!job && job.status !== "OPEN";
  const isApplyingClosed =
    isJobClosed || isMaxApplicantsReached || isAcceptedProvidersLimitReached;
  const hasWhatsAppContact = Boolean(
    normalizeWhatsAppPhone(job?.client?.phone),
  );
  const canAutofill = Boolean(
    isProvider &&
    providerProfile &&
    (providerProfile.bio || providerProfile.hourlyRate),
  );

  useEffect(() => {
    if (!shouldResumeMessageIntent || authStatus !== "authenticated") return;
    if (!session?.user?.id || !job?.client?.id) return;
    if (hasHandledMessageIntentRef.current) return;

    hasHandledMessageIntentRef.current = true;

    if (session.user.id === job.client.id) {
      toast.info("This is your own job posting");
      return;
    }

    router.replace(
      buildMessagesHref(
        prefersDashboardMessages ? "/dashboard/messages" : "/client/messages",
        job.client.id,
        job.client.name || undefined,
        job.client.image,
      ),
    );
  }, [
    authStatus,
    job?.client?.id,
    job?.client?.image,
    job?.client?.name,
    prefersDashboardMessages,
    router,
    session?.user?.id,
    shouldResumeMessageIntent,
  ]);

  useEffect(() => {
    if (!shouldResumeApplyIntent || authStatus !== "authenticated") return;
    if (!isProvider || isJobOwner || existingProposal || isApplyingClosed) {
      return;
    }

    setShowForm(true);
  }, [
    authStatus,
    existingProposal,
    isApplyingClosed,
    isJobOwner,
    isProvider,
    shouldResumeApplyIntent,
  ]);

  useEffect(() => {
    if (!useProfile || !providerProfile) return;

    if (providerProfile.bio) {
      setCoverLetter(providerProfile.bio);
    }
    if (providerProfile.hourlyRate) {
      setProposedPrice(String(providerProfile.hourlyRate));
    }
  }, [providerProfile, useProfile]);

  useEffect(() => {
    const acceptedBookingId =
      existingProposal?.status === "ACCEPTED"
        ? existingProposal.bookingId
        : null;

    if (!acceptedBookingId) {
      setBookingTimeline(null);
      return;
    }

    let cancelled = false;
    apiClient
      .get(`/bookings/${acceptedBookingId}/escrow/milestones`)
      .then((response) => {
        if (!cancelled) {
          setBookingTimeline(response.data as BookingTimelineResponse);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookingTimeline(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [existingProposal?.bookingId, existingProposal?.status]);

  const heroImage = job?.images?.[0] || null;
  const proposalsCount = Number(job?._count?.proposals || 0);
  const overviewItems = [
    {
      label: "Budget",
      value: job?.budget ? formatCurrency(job.budget) : "Open to proposals",
      icon: DollarSign,
    },
    {
      label: "Location",
      value: job?.location || "Remote / flexible",
      icon: MapPin,
    },
    {
      label: "Deadline",
      value: formatDate(job?.deadline),
      icon: Clock,
    },
    {
      label: "Applications",
      value: job?.maxApplicants
        ? `${proposalsCount} / ${job.maxApplicants}`
        : `${proposalsCount}`,
      icon: MessageSquare,
    },
    {
      label: "Hires",
      value: `${acceptedProposalsCount} / ${effectiveMaxAcceptedProviders}`,
      icon: Shield,
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "uploads");

    try {
      const response = await apiClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachments((prev) => [...prev, response.data.url]);
      toast.success("Attachment uploaded");
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("Failed to upload attachment");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = async (index: number) => {
    const fileUrl = attachments[index];
    setAttachments((prev) => prev.filter((_, i) => i !== index));

    const isUploadedAsset = /\/uploads\//.test(fileUrl);
    if (!isUploadedAsset) {
      return;
    }

    try {
      await apiClient.delete(`/upload?url=${encodeURIComponent(fileUrl)}`);
    } catch (removeError) {
      console.error("Attachment delete error:", removeError);
    }
  };

  const addPortfolioLink = () => {
    const trimmed = portfolioLink.trim();
    if (!trimmed) return;

    try {
      const parsed = new URL(trimmed);
      if (!/^https?:$/.test(parsed.protocol)) {
        toast.error("Please enter a valid http(s) URL");
        return;
      }

      if (attachments.includes(trimmed)) {
        toast.info("This link is already attached");
        return;
      }

      setAttachments((prev) => [...prev, trimmed]);
      setPortfolioLink("");
      toast.success("Portfolio link added");
    } catch {
      toast.error("Please enter a valid URL");
    }
  };

  const applyQuickTemplate = (template: ProposalTemplateKey) => {
    if (!job) return;
    const next = buildProposalTemplate(template, job.title, job.budget);
    setCoverLetter(next.coverLetter);
    setProposedPrice(next.price);
    setEstimatedDays(next.estimatedDays);
    setSelectedTemplate(template);
    setSelectedSavedTemplateId(null);
    trackEvent("pricing_hint_applied", {
      userRole: "PROVIDER",
      sourcePage: "/jobs/[id]",
      experimentVariant: quickApplyVariant,
      jobId,
      jobCategory: job?.category?.slug,
    });
  };

  const applySavedTemplate = (template: {
    id: string;
    name: string;
    coverLetter: string;
    price: number | string;
    estimatedDays: number | null;
  }) => {
    setCoverLetter(template.coverLetter);
    setProposedPrice(String(template.price));
    setEstimatedDays(
      template.estimatedDays !== null ? String(template.estimatedDays) : "",
    );
    setSelectedSavedTemplateId(template.id);
    setSelectedTemplate(null);
    if (!templateName) {
      setTemplateName(template.name);
    }
  };

  const handleSaveTemplate = async () => {
    const normalizedName = templateName.trim();
    if (!normalizedName) {
      toast.error("Enter a template name before saving");
      return;
    }

    if (coverLetter.trim().length < 50) {
      toast.error("Cover letter must be at least 50 characters to save");
      return;
    }

    const price = Number(proposedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid price before saving");
      return;
    }

    let daysValue: number | undefined;
    if (estimatedDays) {
      const parsedDays = Number.parseInt(estimatedDays, 10);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        toast.error("Estimated days must be a positive number");
        return;
      }
      daysValue = parsedDays;
    }

    try {
      await createProposalTemplate.mutateAsync({
        name: normalizedName,
        coverLetter: coverLetter.trim(),
        price,
        estimatedDays: daysValue,
      });
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedSavedTemplateId) {
      toast.error("Select a saved template to update");
      return;
    }

    const normalizedName = templateName.trim();
    if (!normalizedName) {
      toast.error("Enter a template name before updating");
      return;
    }

    if (coverLetter.trim().length < 50) {
      toast.error("Cover letter must be at least 50 characters to update");
      return;
    }

    const price = Number(proposedPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid price before updating");
      return;
    }

    let daysValue: number | undefined;
    if (estimatedDays) {
      const parsedDays = Number.parseInt(estimatedDays, 10);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        toast.error("Estimated days must be a positive number");
        return;
      }
      daysValue = parsedDays;
    }

    try {
      await updateProposalTemplate.mutateAsync({
        templateId: selectedSavedTemplateId,
        data: {
          name: normalizedName,
          coverLetter: coverLetter.trim(),
          price,
          estimatedDays: daysValue,
        },
      });
      toast.success("Template updated");
    } catch {
      toast.error("Failed to update template");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedSavedTemplateId) {
      toast.error("Select a saved template to delete");
      return;
    }

    if (!window.confirm("Delete this saved template?")) {
      return;
    }

    try {
      await deleteProposalTemplate.mutateAsync(selectedSavedTemplateId);
      setSelectedSavedTemplateId(null);
      setTemplateName("");
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title || "Job",
          text: job?.description || "View this job on JustInTime",
          url,
        });
        return;
      } catch {
        // Fall back to clipboard below.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Job link copied to clipboard");
    } catch {
      toast.error("Unable to share this job right now");
    }
  };

  const handleMessageClient = () => {
    if (!job?.client?.id) {
      toast.error("Client account is unavailable");
      return;
    }

    if (session?.user?.id && session.user.id === job.client.id) {
      toast.info("This is your own job posting");
      return;
    }

    setShowMessageOptions(true);
  };

  const handleInAppMessage = () => {
    if (!job?.client?.id) {
      toast.error("Client account is unavailable");
      return;
    }

    if (!session) {
      const callbackUrl = encodeURIComponent(
        `/jobs/${jobId}?messageClientInApp=1`,
      );
      router.push(`/auth/login?callbackUrl=${callbackUrl}`);
      return;
    }

    if (session.user.id === job.client.id) {
      toast.info("This is your own job posting");
      return;
    }

    setShowMessageOptions(false);
    router.push(
      buildMessagesHref(
        prefersDashboardMessages ? "/dashboard/messages" : "/client/messages",
        job.client.id,
        job.client.name || undefined,
        job.client.image,
      ),
    );
  };

  const handleWhatsAppMessage = () => {
    const formattedPhone = normalizeWhatsAppPhone(job?.client?.phone);
    if (!formattedPhone) {
      toast.error("Client phone number is unavailable for WhatsApp");
      return;
    }

    const clientName = job?.client?.name || "there";
    const message = encodeURIComponent(
      `Hi ${clientName}, I saw your job \"${job?.title || "on JustInTime"}\" on JustInTime and would like to discuss it.`,
    );

    setShowMessageOptions(false);
    window.open(
      `https://wa.me/${formattedPhone}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openApplyFlow = () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=${applyCallbackUrl}`);
      return;
    }

    if (!isProvider) {
      toast.error("Only providers can submit proposals");
      return;
    }

    if (isJobOwner) {
      toast.error("You cannot apply to your own job");
      return;
    }

    if (existingProposal) {
      toast.info("You already submitted a proposal for this job");
      return;
    }

    trackEvent("provider_apply_started", {
      userRole: "PROVIDER",
      sourcePage: "/jobs/[id]",
      experimentVariant: quickApplyVariant,
      jobId,
      jobCategory: job?.category?.slug,
    });
    setShowForm(true);
  };

  const handleQuickApply = () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=${applyCallbackUrl}`);
      return;
    }

    if (!isProvider || isJobOwner || existingProposal || isApplyingClosed) {
      return;
    }

    const draft = buildProposalTemplate(
      "budget",
      job?.title || "this job",
      job?.budget,
    );
    const quickPrice = Number(draft.price);
    const quickDays = Number.parseInt(draft.estimatedDays, 10);

    if (!Number.isFinite(quickPrice) || quickPrice <= 0) {
      toast.error("Quick Apply could not derive a valid price");
      return;
    }

    if (!draft.coverLetter || draft.coverLetter.trim().length < 50) {
      toast.error("Quick Apply draft did not meet minimum cover-letter length");
      return;
    }

    const metadataAttachments = withFulfillmentPreference([], {
      mode: "INDIVIDUAL",
    });

    submitProposal.mutate(
      {
        jobId,
        coverLetter: draft.coverLetter.trim(),
        price: quickPrice,
        estimatedDays:
          Number.isFinite(quickDays) && quickDays > 0 ? quickDays : undefined,
        attachments: metadataAttachments,
      },
      {
        onSuccess: () => {
          trackEvent("provider_apply_submitted", {
            userRole: "PROVIDER",
            sourcePage: "/jobs/[id]",
            experimentVariant: "quick-apply",
            jobId,
            jobCategory: job?.category?.slug,
          });
          toast.success("Quick Apply submitted successfully");
          setShowForm(false);
        },
        onError: (mutationError: unknown) => {
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      router.push(`/auth/login?callbackUrl=${applyCallbackUrl}`);
      return;
    }

    const price = parseFloat(proposedPrice);
    if (Number.isNaN(price) || price <= 0) {
      toast.error("Please enter a valid proposal price");
      return;
    }

    const days = estimatedDays ? parseInt(estimatedDays, 10) : undefined;
    if (estimatedDays && (!days || days <= 0)) {
      toast.error("Please enter a valid duration");
      return;
    }

    if (coverLetter.trim().length < 50) {
      toast.error("Cover letter must be at least 50 characters long");
      return;
    }

    if (fulfillmentMode === "TEAM" && !selectedTeamId) {
      toast.error("Select a team for team-based fulfillment");
      return;
    }

    const selectedTeam =
      fulfillmentMode === "TEAM"
        ? providerTeams.find((team) => team.id === selectedTeamId)
        : null;

    const metadataAttachments = withFulfillmentPreference(attachments, {
      mode: fulfillmentMode,
      teamId: selectedTeam?.id,
      teamName: selectedTeam?.name,
    });

    submitProposal.mutate(
      {
        jobId,
        coverLetter: coverLetter.trim(),
        price,
        estimatedDays: days,
        attachments: metadataAttachments,
      },
      {
        onSuccess: () => {
          setCoverLetter("");
          setProposedPrice("");
          setEstimatedDays("");
          setAttachments([]);
          setShowForm(false);
          setUseProfile(false);
          setFulfillmentMode("INDIVIDUAL");
          setSelectedTeamId("");
          trackEvent("provider_apply_submitted", {
            userRole: "PROVIDER",
            sourcePage: "/jobs/[id]",
            experimentVariant: quickApplyVariant,
            jobId,
            jobCategory: job?.category?.slug,
          });
          toast.success("Proposal submitted successfully");
        },
        onError: (mutationError: unknown) => {
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  };

  const applyMarkdown = (prefix: string, suffix = "", placeholder = "text") => {
    const textarea = coverLetterRef.current;
    if (!textarea) {
      setCoverLetter((prev) => `${prev}${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = coverLetter.slice(start, end) || placeholder;
    const next =
      coverLetter.slice(0, start) +
      `${prefix}${selected}${suffix}` +
      coverLetter.slice(end);

    setCoverLetter(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex flex-1 items-center justify-center pt-(--public-header-h)">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-slate-600">
              Loading job details...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 pt-(--public-header-h)">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-2xl font-bold text-slate-950">
              Job Not Found
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              The job you&apos;re looking for may have been removed or is no
              longer available.
            </p>
            <Link
              href="/jobs"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to jobs
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />

      <section className="relative overflow-hidden border-b border-emerald-100/70 bg-linear-to-b from-white via-emerald-50/50 to-slate-50 pt-(--public-header-h)">
        <div className="pointer-events-none absolute inset-0 opacity-75">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="absolute right-0 top-14 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-teal-200/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:border-emerald-200 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to jobs
            </Link>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:border-emerald-200 hover:text-emerald-700"
            >
              <span className="material-symbols-outlined text-[18px]">
                share
              </span>
              Share
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
            <div className="overflow-hidden rounded-4xl border border-white/80 bg-white/90 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.32)] backdrop-blur-sm">
              <div className="relative min-h-70 overflow-hidden sm:min-h-85">
                {heroImage ? (
                  <Image
                    src={heroImage}
                    alt={job.title}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-700 via-teal-700 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-linear-to-r from-slate-950/88 via-slate-950/58 to-slate-950/16" />
                <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-slate-950/25 to-transparent" />

                <div className="relative flex h-full min-h-70 flex-col justify-between p-5 text-white sm:min-h-85 sm:p-7">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900 shadow-sm">
                      {job.category?.name || "General"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] shadow-sm ${
                        job.status === "OPEN"
                          ? "bg-emerald-400/95 text-emerald-950"
                          : "bg-slate-900/65 text-white"
                      }`}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                    {job.location ? (
                      <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                        {job.location}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h1 className="max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.8rem] lg:leading-[1.05]">
                      {job.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/82 sm:text-base">
                      {job.description}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-emerald-300" />
                        Posted {formatDate(job.createdAt)}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-emerald-300" />
                        Deadline {formatDate(job.deadline)}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-emerald-300" />
                        {proposalsCount} proposals
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-4xl border border-slate-200/80 bg-white p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Budget overview
              </p>
              <div className="mt-3">
                <p className="text-sm text-slate-600">Client budget</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-800">
                  {job.budget
                    ? formatCurrency(job.budget)
                    : "Open to proposals"}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {overviewItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                  >
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Project brief
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600 sm:text-base">
                {job.description}
              </p>
            </motion.section>

            {job.images?.length > 0 ? (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-950">
                    <ImageIcon className="h-5 w-5 text-emerald-600" />
                    Project photos
                  </h2>
                  {job.images.length > 1 ? (
                    <button
                      onClick={() => setShowImageGallery(true)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
                    >
                      Open gallery
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {job.images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setShowImageGallery(true);
                      }}
                      className="group relative aspect-[1.1] overflow-hidden rounded-2xl bg-slate-100"
                    >
                      <Image
                        src={image}
                        alt={`Job photo ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </motion.section>
            ) : null}

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Before you apply
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Share your approach
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Explain how you would handle the work and why you are a fit.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Price clearly
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Send your proposed amount and, if needed, your estimated
                    time.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Add proof of work
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Attach a resume, portfolio, or sample files to strengthen
                    your pitch.
                  </p>
                </div>
              </div>
            </motion.section>
          </div>

          <div className="space-y-6">
            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-lg font-bold text-slate-950">
                About the client
              </h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  {job.client?.image ? (
                    <Image
                      src={job.client.image}
                      alt={job.client.name || "Client"}
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-xl font-bold text-emerald-700">
                      {(job.client?.name || "?").charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {job.client?.name || "Anonymous client"}
                    </p>
                    {job.client?.isVerified ? (
                      <Shield className="h-4 w-4 text-emerald-500" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Client on JustInTime
                  </p>
                </div>
              </div>

              {!isJobOwner && job.client ? (
                <button
                  onClick={handleMessageClient}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message client
                </button>
              ) : null}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-lg font-bold text-slate-950">
                Submit proposal
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Apply directly from this page with your pricing, message, and
                optional attachments.
              </p>

              <div className="mt-5 space-y-4">
                {isJobClosed ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    This job is currently{" "}
                    <strong>{job.status.toLowerCase()}</strong> and is not
                    accepting new proposals.
                  </div>
                ) : null}

                {isMaxApplicantsReached ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    This job has reached its applicant limit of{" "}
                    {job.maxApplicants}. The client is reviewing existing
                    proposals.
                  </div>
                ) : null}

                {isAcceptedProvidersLimitReached ? (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                    Hiring is full for this job ({acceptedProposalsCount}/
                    {effectiveMaxAcceptedProviders} accepted).
                  </div>
                ) : null}

                {existingProposal ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">
                      You already applied to this job
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-emerald-800">
                      <p>
                        Status: <strong>{existingProposal.status}</strong>
                      </p>
                      <p>
                        Price:{" "}
                        <strong>
                          {formatCurrency(existingProposal.price)}
                        </strong>
                      </p>
                      <p>
                        Submitted:{" "}
                        <strong>
                          {formatDate(existingProposal.createdAt)}
                        </strong>
                      </p>
                      <p>
                        Fulfillment:{" "}
                        <strong>
                          {existingFulfillmentPreference?.mode === "TEAM"
                            ? `Team${existingFulfillmentPreference.teamName ? ` (${existingFulfillmentPreference.teamName})` : ""}`
                            : "Individual"}
                        </strong>
                      </p>
                    </div>
                    {bookingTimeline ? (
                      <div className="mt-3">
                        <PaymentTimelineCard
                          bookingStatus={bookingTimeline.bookingStatus}
                          paymentStatus={
                            bookingTimeline.payment?.status || null
                          }
                          totalAmount={bookingTimeline.totalAmount}
                          milestones={
                            bookingTimeline.escrow?.milestones || null
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {isGuest ? (
                  <button
                    onClick={openApplyFlow}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    Log in to apply
                  </button>
                ) : !isProvider ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    Only provider accounts can submit proposals for jobs.
                  </div>
                ) : isJobOwner ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    This is your own job posting, so you can&apos;t apply to it.
                  </div>
                ) : !showForm && !existingProposal && !isApplyingClosed ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      onClick={handleQuickApply}
                      disabled={submitProposal.isPending}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60"
                      title="Quick Apply uses an auto-filled proposal template"
                    >
                      <Send className="h-4 w-4" />
                      Quick Apply
                    </button>
                    <button
                      onClick={openApplyFlow}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <Send className="h-4 w-4" />
                      Apply for this job
                    </button>
                  </div>
                ) : null}

                <AnimatePresence initial={false}>
                  {showForm && !existingProposal && !isApplyingClosed ? (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleSubmit}
                      className="overflow-hidden space-y-4 border-t border-slate-100 pt-4"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">
                          Quick templates
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(
                            [
                              ["budget", "Budget Offer"],
                              ["premium", "Premium Offer"],
                              ["fast", "Fast Delivery"],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => applyQuickTemplate(key)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                selectedTemplate === key
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {savedTemplates.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-800">
                            Saved templates
                          </label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {savedTemplates.slice(0, 6).map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => applySavedTemplate(template)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  selectedSavedTemplateId === template.id
                                    ? "border-sky-600 bg-sky-600 text-white"
                                    : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                }`}
                              >
                                {template.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {canAutofill ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <label
                            htmlFor="useProfile"
                            className="flex items-center gap-3 text-sm font-semibold text-slate-900"
                          >
                            <input
                              id="useProfile"
                              type="checkbox"
                              checked={useProfile}
                              onChange={(e) => setUseProfile(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            Use my profile details as a starting point
                          </label>
                        </div>
                      ) : null}

                      <div>
                        <label className="block text-sm font-semibold text-slate-800">
                          Fulfillment mode
                        </label>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFulfillmentMode("INDIVIDUAL");
                              setSelectedTeamId("");
                            }}
                            className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                              fulfillmentMode === "INDIVIDUAL"
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            Individual
                          </button>
                          <button
                            type="button"
                            onClick={() => setFulfillmentMode("TEAM")}
                            disabled={providerTeams.length === 0}
                            className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                              fulfillmentMode === "TEAM"
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            Team
                          </button>
                        </div>

                        {fulfillmentMode === "TEAM" ? (
                          <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                          >
                            <option value="">Select team</option>
                            {providerTeams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>

                      <div>
                        <label
                          htmlFor="coverLetter"
                          className="block text-sm font-semibold text-slate-800"
                        >
                          Cover letter (Markdown supported)
                        </label>
                        <div className="mt-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  applyMarkdown("## ", "", "Section title")
                                }
                                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                title="Heading"
                              >
                                H2
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  applyMarkdown("**", "**", "bold text")
                                }
                                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                title="Bold"
                              >
                                Bold
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  applyMarkdown("- ", "", "list item")
                                }
                                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                title="Bullet list"
                              >
                                List
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  applyMarkdown("[", "](https://)", "link text")
                                }
                                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                title="Link"
                              >
                                Link
                              </button>
                            </div>

                            <div className="inline-flex items-center rounded-lg bg-slate-100 p-1">
                              <button
                                type="button"
                                onClick={() => setCoverLetterMode("write")}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                                  coverLetterMode === "write"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600"
                                }`}
                              >
                                <PenLine className="h-3.5 w-3.5" />
                                Write
                              </button>
                              <button
                                type="button"
                                onClick={() => setCoverLetterMode("preview")}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                                  coverLetterMode === "preview"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600"
                                }`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => setCoverLetterMode("split")}
                                className={`hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                                  coverLetterMode === "split"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600"
                                }`}
                              >
                                <Columns2 className="h-3.5 w-3.5" />
                                Split
                              </button>
                            </div>
                          </div>

                          <div
                            className={`grid ${
                              coverLetterMode === "split"
                                ? "sm:grid-cols-2"
                                : "grid-cols-1"
                            }`}
                          >
                            {(coverLetterMode === "write" ||
                              coverLetterMode === "split") && (
                              <textarea
                                ref={coverLetterRef}
                                id="coverLetter"
                                rows={8}
                                required
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                className="w-full border-0 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                placeholder="Outline your approach, timeline, relevant experience, and what the client can expect as deliverables."
                              />
                            )}

                            {(coverLetterMode === "preview" ||
                              coverLetterMode === "split") && (
                              <div className="h-full min-h-55 border-t sm:border-t-0 sm:border-l border-slate-100 bg-slate-50/70 p-4 overflow-auto">
                                {coverLetter.trim() ? (
                                  <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-a:text-emerald-700">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {coverLetter}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500">
                                    Preview will appear here as you write in
                                    Markdown.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Use Markdown for structure. Include your approach,
                          similar work, and expected delivery plan.
                        </p>
                        <p className="mt-1 text-right text-xs text-slate-500">
                          {coverLetter.trim().length} / 50 characters minimum
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="proposedPrice"
                            className="block text-sm font-semibold text-slate-800"
                          >
                            Proposed price
                          </label>
                          <div className="relative mt-2">
                            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="proposedPrice"
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={proposedPrice}
                              onChange={(e) => setProposedPrice(e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="estimatedDays"
                            className="block text-sm font-semibold text-slate-800"
                          >
                            Estimated days
                          </label>
                          <input
                            id="estimatedDays"
                            type="number"
                            min="1"
                            step="1"
                            value={estimatedDays}
                            onChange={(e) => setEstimatedDays(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800">
                          Save as template
                        </label>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                            placeholder="Template name (e.g. Electrical urgent)"
                          />
                          <button
                            type="button"
                            onClick={handleSaveTemplate}
                            disabled={createProposalTemplate.isPending}
                            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {createProposalTemplate.isPending
                              ? "Saving..."
                              : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={handleUpdateTemplate}
                            disabled={
                              !selectedSavedTemplateId ||
                              updateProposalTemplate.isPending
                            }
                            className="rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50"
                          >
                            {updateProposalTemplate.isPending
                              ? "Updating..."
                              : "Update"}
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteTemplate}
                            disabled={
                              !selectedSavedTemplateId ||
                              deleteProposalTemplate.isPending
                            }
                            className="rounded-2xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            {deleteProposalTemplate.isPending
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-800">
                          Attachments & supporting material
                        </label>
                        <p className="mt-1 text-xs text-slate-500">
                          Add resume/CV, certifications, portfolio files, or
                          links.
                        </p>
                        <div className="mt-2 space-y-3">
                          {attachments.map((url, index) => (
                            <div
                              key={`${url}-${index}`}
                              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                                <span className="truncate text-sm text-slate-600">
                                  {url.split("/").pop()}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void removeAttachment(index)}
                                className="rounded-full p-1 text-slate-500 transition-colors hover:bg-white hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}

                          <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Upload resume or portfolio
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              value={portfolioLink}
                              onChange={(e) => setPortfolioLink(e.target.value)}
                              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              placeholder="https://your-portfolio.com/project"
                            />
                            <button
                              type="button"
                              onClick={addPortfolioLink}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Add link
                            </button>
                          </div>
                        </div>
                      </div>

                      {submitProposal.isError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          {submitProposal.error instanceof Error
                            ? submitProposal.error.message
                            : "Failed to submit proposal"}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          disabled={submitProposal.isPending}
                          className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitProposal.isPending || isUploading}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {submitProposal.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Submit proposal
                            </>
                          )}
                        </button>
                      </div>
                    </motion.form>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.section>
          </div>
        </div>
      </main>

      <Dialog open={showMessageOptions} onOpenChange={setShowMessageOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message client</DialogTitle>
            <DialogDescription>
              {isGuest
                ? "Choose how to reach out. In-app chat requires login first."
                : "Choose how you want to contact this client."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleInAppMessage}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4" />
              {isGuest ? "Log in for in-app message" : "Continue in-app"}
            </button>

            <button
              onClick={handleWhatsAppMessage}
              disabled={!hasWhatsAppContact}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Message on WhatsApp
            </button>

            {!hasWhatsAppContact ? (
              <p className="text-xs text-slate-500">
                The client has not shared a WhatsApp number.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {showImageGallery && job.images?.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4">
          <button
            onClick={() => setShowImageGallery(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="w-full max-w-5xl">
            <div className="relative aspect-[1.25] overflow-hidden rounded-3xl bg-slate-900">
              <Image
                src={job.images[selectedImageIndex]}
                alt={`Job image ${selectedImageIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized
              />
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {job.images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 ${
                    selectedImageIndex === index
                      ? "border-emerald-400"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/96 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
              Client budget
            </p>
            <p className="truncate text-sm font-bold text-slate-950">
              {job.budget ? formatCurrency(job.budget) : "Open to proposals"}
            </p>
          </div>
          <button
            onClick={openApplyFlow}
            disabled={
              Boolean(existingProposal) || isJobClosed || isMaxApplicantsReached
            }
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {existingProposal ? "Applied" : "Apply"}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
