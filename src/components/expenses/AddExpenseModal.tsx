"use client";

import { useState, useEffect } from "react";
import { Loader2, Camera, ScanLine, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { createExpense, scanReceipt } from "@/app/actions/expenses";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface JobOption {
  id: string;
  title: string;
  clientName?: string | null;
}

export function AddExpenseModal({ isOpen, onClose }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState<"UPLOAD" | "VERIFY">("UPLOAD");
  const [isOnline, setIsOnline] = useState(true);

  // Form Data
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [hasScanData, setHasScanData] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!isOpen) return;
      setIsLoadingJobs(true);

      try {
        const response = await fetch("/api/provider/expenses/jobs");
        if (!response.ok) throw new Error("Failed to load jobs");

        const data = await response.json();
        setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
        setJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    void fetchJobs();
  }, [isOpen]);

  // Upload receipt and scan deterministic metadata
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isOnline) {
      toast.warning("Scanning requires internet. Enter details manually.");
      setStep("VERIFY");
      return;
    }

    setScanning(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("folder", "uploads");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload receipt");
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData?.url) {
        throw new Error("Upload did not return a receipt URL");
      }

      setReceiptUrl(uploadData.url);

      const result = await scanReceipt(uploadData.url);
      if (result.success && result.data) {
        if (Number(result.data.amount) > 0) {
          setAmount(result.data.amount.toString());
        }
        if (result.data.merchant) {
          setMerchant(result.data.merchant);
        }
        if (result.data.category) {
          setCategory(result.data.category);
        }
        if (result.data.description) {
          setDescription(result.data.description);
        }
        setHasScanData(true);
        setStep("VERIFY");
        toast.success("Receipt uploaded. Please verify extracted details.");
      } else {
        setHasScanData(false);
        setStep("VERIFY");
        toast.warning(
          result.error || "Receipt uploaded. Please enter details manually.",
        );
      }
    } catch (err) {
      toast.error("Upload or scan failed. Please enter manually.");
      setHasScanData(false);
      setStep("VERIFY");
    } finally {
      setScanning(false);
    }
  };

  const handleManualEntry = () => {
    setHasScanData(false);
    setStep("VERIFY");
  };

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);

    const status = receiptUrl
      ? hasScanData
        ? "SCANNED"
        : "PENDING_SCAN"
      : "PENDING_SCAN";

    const payload = {
      amount: parseFloat(amount),
      merchant,
      category,
      date: new Date(date),
      description,
      receiptUrl: receiptUrl || undefined,
      jobId: selectedJobId || undefined,
      status,
    };

    try {
      if (!isOnline) {
        // Offline: Save to Dexie SyncQueue
        await db.syncQueue.add({
          actionName: "createExpense",
          payload: payload,
          createdAt: Date.now(),
          status: "PENDING",
          retryCount: 0,
        });
        toast("Saved offline. Will sync when online.", { icon: "📡" });
        onClose();
        // Optionally update local cache for Optimistic UI here if ExpenseList was reading from Dexie
      } else {
        // Online: Direct Server Action
        const result = await createExpense(payload as any);

        if (result.success) {
          toast.success("Expense added successfully!");
          onClose();
          router.refresh();
        } else {
          toast.error(result.error || "Failed to add expense");
        }
      }

      // Reset form
      setAmount("");
      setMerchant("");
      setCategory("Uncategorized");
      setDescription("");
      setReceiptUrl("");
      setSelectedJobId("");
      setHasScanData(false);
      setStep("UPLOAD");
    } catch (err) {
      console.error(err);
      toast.error("Error saving expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Add New Expense
            {!isOnline && (
              <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-1 rounded flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> Offline Mode
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {scanning ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse rounded-full"></div>
              <ScanLine className="h-16 w-16 text-emerald-600 animate-bounce relative z-10" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                AI Analysis in Progress...
              </h3>
              <p className="text-sm text-gray-500">
                Extracting merchant, date, and items.
              </p>
            </div>
          </div>
        ) : step === "UPLOAD" ? (
          <div className="py-6 space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer relative ${!isOnline ? "bg-gray-50 border-gray-200 cursor-not-allowed" : "border-gray-200 hover:bg-gray-50"}`}
            >
              <input
                type="file"
                accept="image/*"
                disabled={!isOnline}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={handleFileUpload}
              />
              <div
                className={`${!isOnline ? "bg-gray-200" : "bg-emerald-100"} p-3 rounded-full mb-3`}
              >
                <Camera
                  className={`h-6 w-6 ${!isOnline ? "text-gray-400" : "text-emerald-600"}`}
                />
              </div>
              <h3 className="font-semibold text-gray-900">Scan Receipt</h3>
              <p className="text-sm text-gray-500 mt-1">
                {isOnline
                  ? "Take a photo or upload. AI will fill details."
                  : "Scanning unavailable offline."}
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleManualEntry}
            >
              Enter Manually
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Merchant</Label>
              <Input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Home Depot"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Uncategorized">Uncategorized</option>
                <option value="Materials">Materials</option>
                <option value="Travel">Travel</option>
                <option value="Food">Food</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details"
              />
            </div>

            <div className="space-y-2">
              <Label>Linked Job (Optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                disabled={isLoadingJobs}
              >
                <option value="">No job linked</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                    {job.clientName ? ` • ${job.clientName}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {receiptUrl && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                Receipt uploaded and linked to this expense.
              </p>
            )}

            {!receiptUrl && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                No receipt attached. Expense will remain pending verification.
              </p>
            )}

            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("UPLOAD")}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : isOnline ? (
                  "Save Expense"
                ) : (
                  "Save Locally"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
