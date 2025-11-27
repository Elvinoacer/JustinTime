"use client";

import { useState, useTransition } from "react";
import { verifyProvider } from "@/app/actions/admin";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface ProviderVerificationCardProps {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    profile: {
      bio: string | null;
      skills: string[];
      hourlyRate: number | null;
      portfolio: string[];
      verificationStatus: string | null;
      idDocument: string | null;
      isVerified: boolean;
      location: string | null;
      certifications: any;
      education: any;
    } | null;
  };
}

export default function ProviderVerificationCard({
  user,
}: ProviderVerificationCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  if (!user.profile) return null;

  const handleVerify = (status: "VERIFIED" | "REJECTED" | "PENDING") => {
    if (
      !confirm(
        `Are you sure you want to set this provider's status to ${status}?`
      )
    )
      return;

    startTransition(async () => {
      await verifyProvider(user.id, status);
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 flex justify-between items-center">
        <h3 className="font-bold text-xl text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">
            verified_user
          </span>
          <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            Provider Verification
          </span>
        </h3>
        <Link
          href={`/professionals/${user.id}`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 text-sm font-medium backdrop-blur-sm"
        >
          <span>View Public Profile</span>
          <span className="material-symbols-outlined text-sm">open_in_new</span>
        </Link>
      </div>

      <div className="p-6 space-y-8">
        {/* Documents Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Profile Picture
            </p>
            <div
              className="relative h-56 w-full bg-slate-50 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-all group"
              onClick={() => user.image && setShowImageModal(user.image)}
            >
              {user.image ? (
                <>
                  <Image
                    src={user.image}
                    alt="Profile"
                    fill
                    className="object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full">
                      zoom_in
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">
                    person
                  </span>
                  <span className="text-sm">No image</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ID Document
            </p>
            <div
              className="relative h-56 w-full bg-slate-50 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer transition-all group"
              onClick={() =>
                user.profile?.idDocument &&
                setShowImageModal(user.profile.idDocument)
              }
            >
              {user.profile.idDocument ? (
                <>
                  <Image
                    src={user.profile.idDocument}
                    alt="ID Document"
                    fill
                    className="object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full">
                      zoom_in
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <span className="material-symbols-outlined text-4xl">
                    description
                  </span>
                  <span className="text-sm">No document uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bio */}
          <div className="col-span-1 md:col-span-2 p-6 bg-slate-50 rounded-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <span className="material-symbols-outlined text-6xl">
                format_quote
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Professional Bio
            </p>
            <p className="text-slate-700 leading-relaxed text-sm">
              {user.profile.bio || "No bio provided."}
            </p>
          </div>

          {/* Location & Rate */}
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Location
              </p>
              <p className="text-slate-900 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">
                  location_on
                </span>
                {user.profile.location || "Not set"}
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Hourly Rate
              </p>
              <p className="text-slate-900 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">
                  payments
                </span>
                {user.profile.hourlyRate
                  ? `KES ${user.profile.hourlyRate}/hr`
                  : "Not set"}
              </p>
            </div>
          </div>

          {/* Skills */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Skills
            </p>
            <div className="flex flex-wrap gap-2">
              {user.profile.skills.length > 0 ? (
                user.profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No skills listed
                </p>
              )}
            </div>
          </div>

          {/* Education */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Education
            </p>
            <div className="space-y-4">
              {Array.isArray(user.profile.education) &&
              user.profile.education.length > 0 ? (
                user.profile.education.map((edu: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="material-symbols-outlined text-slate-400 text-sm">
                        school
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {edu.institution}
                      </p>
                      <p className="text-xs text-slate-600">
                        {edu.degree} in {edu.field}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {edu.startYear} - {edu.endYear || "Present"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No education listed
                </p>
              )}
            </div>
          </div>

          {/* Certifications */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Certifications
            </p>
            <div className="space-y-4">
              {Array.isArray(user.profile.certifications) &&
              user.profile.certifications.length > 0 ? (
                user.profile.certifications.map((cert: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="material-symbols-outlined text-slate-400 text-sm">
                        workspace_premium
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">
                        {cert.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {cert.issuer} • {cert.date}
                      </p>
                      {cert.fileUrl && (
                        <button
                          onClick={() => setShowImageModal(cert.fileUrl)}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1 flex items-center gap-1 font-medium"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            visibility
                          </span>
                          View Certificate
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No certifications listed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Preview */}
        {user.profile.portfolio.length > 0 && (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Portfolio ({user.profile.portfolio.length})
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {user.profile.portfolio.map((item, idx) => (
                <div
                  key={idx}
                  className="relative h-32 bg-white rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => setShowImageModal(item)}
                >
                  <Image
                    src={item}
                    alt={`Portfolio ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full">
                      zoom_in
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-900 rounded-xl text-white gap-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-full border-2 ${
                user.profile.verificationStatus === "VERIFIED"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                  : user.profile.verificationStatus === "REJECTED"
                  ? "bg-red-500/10 border-red-500 text-red-400"
                  : "bg-amber-500/10 border-amber-500 text-amber-400"
              }`}
            >
              <span className="material-symbols-outlined text-3xl">
                {user.profile.verificationStatus === "VERIFIED"
                  ? "check_circle"
                  : user.profile.verificationStatus === "REJECTED"
                  ? "cancel"
                  : "pending"}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Current Status
              </p>
              <p
                className={`text-2xl font-bold ${
                  user.profile.verificationStatus === "VERIFIED"
                    ? "text-emerald-400"
                    : user.profile.verificationStatus === "REJECTED"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              >
                {user.profile.verificationStatus || "PENDING"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleVerify("PENDING")}
              disabled={
                isPending || user.profile.verificationStatus === "PENDING"
              }
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                user.profile.verificationStatus === "PENDING"
                  ? "bg-amber-500 text-white cursor-default shadow-lg shadow-amber-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-amber-500 hover:text-white border border-slate-700 hover:border-amber-500"
              }`}
            >
              Set Pending
            </button>
            <button
              onClick={() => handleVerify("REJECTED")}
              disabled={
                isPending || user.profile.verificationStatus === "REJECTED"
              }
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                user.profile.verificationStatus === "REJECTED"
                  ? "bg-red-500 text-white cursor-default shadow-lg shadow-red-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-red-500 hover:text-white border border-slate-700 hover:border-red-500"
              }`}
            >
              Reject
            </button>
            <button
              onClick={() => handleVerify("VERIFIED")}
              disabled={
                isPending || user.profile.verificationStatus === "VERIFIED"
              }
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                user.profile.verificationStatus === "VERIFIED"
                  ? "bg-emerald-500 text-white cursor-default shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-emerald-500 hover:text-white border border-slate-700 hover:border-emerald-500"
              }`}
            >
              Verify
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
          onClick={() => setShowImageModal(null)}
        >
          <div className="relative w-full max-w-5xl h-[85vh]">
            <Image
              src={showImageModal}
              alt="Document Preview"
              fill
              className="object-contain"
            />
            <button
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
              onClick={() => setShowImageModal(null)}
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
