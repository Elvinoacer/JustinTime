"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteEquipmentItem,
  getMyEquipmentRegistry,
  getMySolarSpecialistProfile,
  registerAsSolarSpecialist,
  submitCertification,
  upsertEquipmentItem,
} from "@/app/actions/solar";
import Link from "next/link";
import { ShieldCheck, Upload, Wrench } from "lucide-react";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function SolarSpecialistApplyPage() {
  const [loading, setLoading] = useState(true);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingCertification, setSubmittingCertification] = useState(false);
  const [submittingEquipment, setSubmittingEquipment] = useState(false);
  const [uploadingCertification, setUploadingCertification] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const [experienceYears, setExperienceYears] = useState("2");
  const [serviceRadius, setServiceRadius] = useState("30");
  const [specializations, setSpecializations] = useState(
    "Residential, Commercial, Off-grid",
  );
  const [equipmentOwned, setEquipmentOwned] = useState(
    "Multimeter, Safety Harness, Drill Set",
  );
  const [portfolioUrls, setPortfolioUrls] = useState("");

  const [certName, setCertName] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploadedDocumentName, setUploadedDocumentName] = useState("");

  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState("");
  const [equipmentQuantity, setEquipmentQuantity] = useState("1");

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<any[]>([]);
  const certificationFileInputRef = useRef<HTMLInputElement>(null);

  const completedChecklist = useMemo(() => {
    const hasProfile = profileLoaded;
    const hasCertification = certifications.length > 0;
    const hasEquipment = equipmentItems.length > 0;

    return [hasProfile, hasCertification, hasEquipment].filter(Boolean).length;
  }, [profileLoaded, certifications.length, equipmentItems.length]);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [profileResult, equipmentResult] = await Promise.all([
        getMySolarSpecialistProfile(),
        getMyEquipmentRegistry(),
      ]);

      if (profileResult.success) {
        if (profileResult.specialist) {
          setProfileLoaded(true);
          setExperienceYears(
            String(profileResult.specialist.experienceYears || 2),
          );
          setServiceRadius(
            String(profileResult.specialist.serviceRadius || 30),
          );
          setSpecializations(
            (profileResult.specialist.specializations || []).join(", ") ||
              "Residential, Commercial",
          );
          setEquipmentOwned(
            (profileResult.specialist.equipmentOwned || []).join(", ") ||
              "Multimeter, Safety Gear",
          );
          setPortfolioUrls(
            (profileResult.specialist.portfolioUrls || []).join("\n"),
          );
        }

        setCertifications(profileResult.certifications || []);
      }

      if (equipmentResult.success) {
        setEquipmentItems(equipmentResult.equipment || []);
      }

      if (!profileResult.success && !equipmentResult.success) {
        setMessage({
          type: "error",
          text:
            profileResult.error ||
            equipmentResult.error ||
            "Failed to load data",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProfileSubmit = async () => {
    setSubmittingProfile(true);
    setMessage(null);

    const result = await registerAsSolarSpecialist({
      experienceYears: Number.parseInt(experienceYears || "0", 10),
      serviceRadius: Number.parseInt(serviceRadius || "0", 10) || undefined,
      specializations: splitCommaSeparated(specializations),
      equipmentOwned: splitCommaSeparated(equipmentOwned),
      portfolioUrls: portfolioUrls
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "Failed to save profile",
      });
      setSubmittingProfile(false);
      return;
    }

    setMessage({
      type: "success",
      text: "Specialist profile saved successfully.",
    });
    setProfileLoaded(true);
    await loadData();
    setSubmittingProfile(false);
  };

  const handleCertificationSubmit = async () => {
    setSubmittingCertification(true);
    setMessage(null);

    if (!documentUrl.trim()) {
      setMessage({
        type: "error",
        text: "Upload a certification document PDF before submitting.",
      });
      setSubmittingCertification(false);
      return;
    }

    const result = await submitCertification({
      name: certName,
      issuingBody,
      licenseNumber: licenseNumber || undefined,
      documentUrl,
    });

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "Failed to submit certification",
      });
      setSubmittingCertification(false);
      return;
    }

    setMessage({
      type: "success",
      text: "Certification submitted for admin verification.",
    });
    setCertName("");
    setIssuingBody("");
    setLicenseNumber("");
    setDocumentUrl("");
    setUploadedDocumentName("");
    await loadData();
    setSubmittingCertification(false);
  };

  const handleCertificationFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setMessage(null);

    if (file.type !== "application/pdf") {
      setMessage({
        type: "error",
        text: "Only PDF certification documents are supported.",
      });
      if (certificationFileInputRef.current) {
        certificationFileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "Certification PDF must be smaller than 10MB.",
      });
      if (certificationFileInputRef.current) {
        certificationFileInputRef.current.value = "";
      }
      return;
    }

    setUploadingCertification(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: uploadData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "Failed to upload certification");
      }

      setDocumentUrl(payload.url);
      setUploadedDocumentName(payload.fileName || file.name);
      setMessage({
        type: "success",
        text: "Certification document uploaded successfully.",
      });
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Failed to upload certification document.";
      setMessage({ type: "error", text: messageText });
    } finally {
      setUploadingCertification(false);
      if (certificationFileInputRef.current) {
        certificationFileInputRef.current.value = "";
      }
    }
  };

  const handleEquipmentSubmit = async () => {
    setSubmittingEquipment(true);
    setMessage(null);

    const result = await upsertEquipmentItem({
      name: equipmentName,
      category: equipmentCategory,
      quantity: Number.parseInt(equipmentQuantity || "1", 10),
      condition: "GOOD",
    });

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "Failed to add equipment",
      });
      setSubmittingEquipment(false);
      return;
    }

    setMessage({ type: "success", text: "Equipment item added." });
    setEquipmentName("");
    setEquipmentCategory("");
    setEquipmentQuantity("1");
    await loadData();
    setSubmittingEquipment(false);
  };

  const handleDeleteEquipment = async (id: string) => {
    setMessage(null);
    const result = await deleteEquipmentItem({ id });
    if (!result.success) {
      setMessage({
        type: "error",
        text: result.error || "Failed to remove item",
      });
      return;
    }

    setMessage({ type: "success", text: "Equipment item removed." });
    await loadData();
  };

  return (
    <div className="space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Solar Specialist Application
        </h1>
        <p className="text-gray-600 mb-4">
          Complete your specialist profile, submit certifications, and maintain
          equipment readiness.
        </p>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          Checklist progress: <strong>{completedChecklist}/3</strong> completed
          (Profile, Certification, Equipment)
        </div>

        {message && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            Specialist Profile
          </h2>

          {loading ? <p className="text-gray-500">Loading profile...</p> : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Experience Years
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Radius (km)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={serviceRadius}
              onChange={(e) => setServiceRadius(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specializations (comma separated)
            </label>
            <input
              type="text"
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Equipment Owned (comma separated)
            </label>
            <input
              type="text"
              value={equipmentOwned}
              onChange={(e) => setEquipmentOwned(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio URLs (one per line)
            </label>
            <textarea
              rows={4}
              value={portfolioUrls}
              onChange={(e) => setPortfolioUrls(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <button
            onClick={handleProfileSubmit}
            disabled={submittingProfile}
            className="w-full rounded-xl bg-amber-600 text-white py-3 font-semibold hover:bg-amber-700 disabled:opacity-60"
          >
            {submittingProfile ? "Saving..." : "Save Specialist Profile"}
          </button>
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-600" />
            Certification Submission
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certification Name
            </label>
            <input
              type="text"
              value={certName}
              onChange={(e) => setCertName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issuing Body
            </label>
            <input
              type="text"
              value={issuingBody}
              onChange={(e) => setIssuingBody(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Number (optional)
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Certification Document (PDF)
            </label>
            <input
              ref={certificationFileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleCertificationFileUpload}
              className="hidden"
            />
            <div className="rounded-xl border border-gray-300 p-3 space-y-3">
              <button
                type="button"
                onClick={() => certificationFileInputRef.current?.click()}
                disabled={uploadingCertification}
                className="w-full rounded-lg border border-amber-300 bg-amber-50 text-amber-700 px-4 py-2.5 font-medium hover:bg-amber-100 disabled:opacity-60"
              >
                {uploadingCertification
                  ? "Uploading certification..."
                  : "Upload Certification PDF"}
              </button>

              {documentUrl ? (
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="text-emerald-700 font-medium">
                    Uploaded: {uploadedDocumentName || "certificate.pdf"}
                  </p>
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-700 hover:text-amber-800 underline"
                  >
                    Preview uploaded document
                  </a>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Upload the EPRA or equivalent certification document in PDF
                  format.
                </p>
              )}

              <input
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="Or paste a direct document URL"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleCertificationSubmit}
            disabled={submittingCertification}
            className="w-full rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-gray-800 disabled:opacity-60"
          >
            {submittingCertification ? "Submitting..." : "Submit Certification"}
          </button>

          <div className="pt-3 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 mb-2">
              Submitted Certifications
            </h3>
            {certifications.length === 0 ? (
              <p className="text-sm text-gray-500">
                No certifications submitted yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {certifications.map((certification) => (
                  <li
                    key={certification.id}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-900">
                        {certification.name}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {certification.status}
                      </span>
                    </div>
                    <p className="text-gray-500">{certification.issuingBody}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-600" />
          Equipment Registry
        </h2>

        <div className="grid md:grid-cols-4 gap-3">
          <input
            type="text"
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
            placeholder="Equipment name"
            className="rounded-xl border border-gray-300 px-4 py-3"
          />
          <input
            type="text"
            value={equipmentCategory}
            onChange={(e) => setEquipmentCategory(e.target.value)}
            placeholder="Category"
            className="rounded-xl border border-gray-300 px-4 py-3"
          />
          <input
            type="number"
            min={1}
            value={equipmentQuantity}
            onChange={(e) => setEquipmentQuantity(e.target.value)}
            placeholder="Qty"
            className="rounded-xl border border-gray-300 px-4 py-3"
          />
          <button
            onClick={handleEquipmentSubmit}
            disabled={submittingEquipment}
            className="rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60"
          >
            {submittingEquipment ? "Adding..." : "Add Item"}
          </button>
        </div>

        {equipmentItems.length === 0 ? (
          <p className="text-sm text-gray-500">No equipment registered yet.</p>
        ) : (
          <ul className="space-y-2">
            {equipmentItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {item.name} ({item.quantity})
                  </p>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <button
                  onClick={() => handleDeleteEquipment(item.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-2 text-sm text-gray-600">
          Need admin review actions? Open{" "}
          <Link
            href="/dashboard/solar/certifications"
            className="text-amber-700 hover:text-amber-800"
          >
            Certification Queue
          </Link>
          .
        </div>
      </section>
    </div>
  );
}
