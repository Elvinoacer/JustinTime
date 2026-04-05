"use client";

import ImageCropper from "@/components/ImageCropper";
import apiClient from "@/lib/api/client";
import {
  useClientProfile,
  useUpdateClientProfile,
} from "@/lib/api/hooks/useClientProfile";
import { VALIDATION } from "@/lib/constants/validation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const CLIENT_INTEREST_LIMIT = VALIDATION.MAX_CLIENT_INTERESTS;

function formatRoleLabel(role: string): string {
  return role
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatErrorMessage(error: unknown): string {
  const known = error as {
    data?: { error?: string };
    message?: string;
  };

  return known?.data?.error || known?.message || "Unable to load your profile.";
}

export default function ClientProfilePage() {
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useClientProfile();
  const updateProfileMutation = useUpdateClientProfile();

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories", "client-profile"],
    queryFn: async (): Promise<Category[]> => {
      const response = await apiClient.get("/categories");
      const rawData = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

      return rawData
        .filter(
          (category): category is { id: string; name: string; slug: string } =>
            Boolean(category) &&
            typeof category.id === "string" &&
            typeof category.name === "string" &&
            typeof category.slug === "string" &&
            category.id !== "all",
        )
        .map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });

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

  useEffect(() => {
    if (!profile || !isPristine) {
      return;
    }

    setFormData({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      clientInterests: Array.isArray(profile.clientInterests)
        ? profile.clientInterests
        : [],
    });
  }, [profile, isPristine]);

  const rolePills = useMemo(() => {
    if (!profile) {
      return [] as string[];
    }

    const roleSet = new Set<string>();
    if (typeof profile.role === "string" && profile.role.trim()) {
      roleSet.add(profile.role.toUpperCase());
    }
    if (Array.isArray(profile.roles)) {
      profile.roles
        .filter((role): role is string => typeof role === "string")
        .forEach((role) => roleSet.add(role.toUpperCase()));
    }

    return Array.from(roleSet);
  }, [profile]);

  const joinedOnLabel = useMemo(() => {
    if (!profile?.createdAt) {
      return "";
    }

    const date = new Date(profile.createdAt);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-KE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [profile?.createdAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateProfileMutation.mutate(
      {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        clientInterests: formData.clientInterests,
      },
      {
        onSuccess: () => {
          setIsPristine(true);
        },
      },
    );
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
      const uploadData = new FormData();
      uploadData.append("file", croppedBlob, "profile.jpg");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Upload failed");
      }

      await updateProfileMutation.mutateAsync({ image: data.url });
      setIsPristine(true);
    } catch (uploadError) {
      console.error("Avatar upload error:", uploadError);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const updateField = (field: "name" | "phone", value: string) => {
    setIsPristine(false);
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleInterest = (interestId: string) => {
    setFormData((prev) => {
      const isSelected = prev.clientInterests.includes(interestId);

      if (!isSelected && prev.clientInterests.length >= CLIENT_INTEREST_LIMIT) {
        toast.info(`You can select up to ${CLIENT_INTEREST_LIMIT} interests.`);
        return prev;
      }

      setIsPristine(false);

      return {
        ...prev,
        clientInterests: isSelected
          ? prev.clientInterests.filter((id) => id !== interestId)
          : [...prev.clientInterests, interestId],
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-bold text-red-900">
            Unable to load profile
          </h1>
          <p className="mt-2 text-sm text-red-800">
            {formatErrorMessage(error)}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            Profile unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            We could not find your client profile right now. Please refresh and
            try again.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Client Profile
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your client workspace details are loaded from the same account, even
            when you also use provider mode.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rolePills.map((role) => (
            <span
              key={role}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
            >
              {formatRoleLabel(role)}
            </span>
          ))}
          {profile.preferredWorkspace ? (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Preferred: {formatRoleLabel(profile.preferredWorkspace)}
            </span>
          ) : null}
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-28 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-600" />

        <div className="px-4 pb-6 sm:px-6 lg:px-8 lg:pb-8">
          <div className="-mt-12 mb-6 flex items-end justify-between gap-4">
            <div className="relative">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
                {profile.image ? (
                  <Image
                    src={profile.image}
                    alt={profile.name || "Profile"}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-3xl font-bold text-emerald-700">
                    {(profile.name || "U").charAt(0)}
                  </div>
                )}

                {isUploadingAvatar ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:text-emerald-600"
                title="Change photo"
              >
                <span className="material-symbols-outlined text-base">
                  photo_camera
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>

            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {joinedOnLabel ? `Joined ${joinedOnLabel}` : "Active account"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Full name
                </span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Your full name"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Email address
                </span>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Phone number
              </span>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="254712345678"
              />
            </label>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Service interests
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose up to {CLIENT_INTEREST_LIMIT} categories to improve
                    recommendations.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formData.clientInterests.length}/{CLIENT_INTEREST_LIMIT}
                </span>
              </div>

              {isLoadingCategories ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
                    />
                  ))}
                </div>
              ) : categories.length > 0 ? (
                <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 sm:grid-cols-3 lg:grid-cols-4">
                  {categories.map((category) => {
                    const isSelected = formData.clientInterests.includes(
                      category.id,
                    );

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleInterest(category.id)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors sm:text-sm ${
                          isSelected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Categories are currently unavailable. You can still update
                  your basic profile details.
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                This updates your client workspace profile without affecting
                provider setup details.
              </p>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending || isPristine}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">
                      save
                    </span>
                    Save changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {showImageCropper && selectedImage ? (
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowImageCropper(false)}
        />
      ) : null}
    </div>
  );
}
