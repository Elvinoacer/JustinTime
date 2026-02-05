"use client";

import { useState, useEffect } from "react";
import { Loader2, Camera, Upload, ScanLine, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { createExpense, scanReceipt } from "@/app/actions/expenses";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/db";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");

  const router = useRouter();

  useEffect(() => {
      setIsOnline(navigator.onLine);
      const setOnline = () => setIsOnline(true);
      const setOffline = () => setIsOnline(false);
      window.addEventListener('online', setOnline);
      window.addEventListener('offline', setOffline);
      return () => {
          window.removeEventListener('online', setOnline);
          window.removeEventListener('offline', setOffline);
      }
  }, []);

  // Mock File Upload Handler
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
        const mockUrl = URL.createObjectURL(file);
        
        // Call AI Scan
        const result = await scanReceipt(mockUrl);
        if (result.success && result.data) {
            setAmount(result.data.amount.toString());
            setMerchant(result.data.merchant);
            setCategory(result.data.category);
            setDescription(result.data.description);
            setStep("VERIFY");
            toast.success("Receipt Scanned! Please verify details.");
        }
    } catch (err) {
        toast.error("Scan failed. Please enter manually.");
        setStep("VERIFY");
    } finally {
        setScanning(false);
    }
  };

  const handleManualEntry = () => {
    setStep("VERIFY");
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    const payload = {
        amount: parseFloat(amount),
        merchant,
        category,
        date: new Date(date),
        description,
        status: "VERIFIED"
    };

    try {
        if (!isOnline) {
            // Offline: Save to Dexie SyncQueue
            await db.syncQueue.add({
                actionName: 'createExpense',
                payload: payload,
                createdAt: Date.now(),
                status: 'PENDING',
                retryCount: 0
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
                toast.error("Failed to add expense");
            }
        }
        
        // Reset form
        setAmount("");
        setMerchant("");
        setCategory("Uncategorized");
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
              {!isOnline && <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-1 rounded flex items-center gap-1"><WifiOff className="h-3 w-3"/> Offline Mode</span>}
          </DialogTitle>
        </DialogHeader>

        {scanning ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse rounded-full"></div>
                    <ScanLine className="h-16 w-16 text-emerald-600 animate-bounce relative z-10" />
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">AI Analysis in Progress...</h3>
                    <p className="text-sm text-gray-500">Extracting merchant, date, and items.</p>
                </div>
            </div>
        ) : step === "UPLOAD" ? (
            <div className="py-6 space-y-4">
                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer relative ${!isOnline ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                        type="file" 
                        accept="image/*" 
                        disabled={!isOnline}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        onChange={handleFileUpload}
                     />
                    <div className={`${!isOnline ? 'bg-gray-200' : 'bg-emerald-100'} p-3 rounded-full mb-3`}>
                        <Camera className={`h-6 w-6 ${!isOnline ? 'text-gray-400' : 'text-emerald-600'}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900">Scan Receipt</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {isOnline ? "Take a photo or upload. AI will fill details." : "Scanning unavailable offline."}
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

                <Button variant="outline" className="w-full" onClick={handleManualEntry}>
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

                <div className="pt-2 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("UPLOAD")}>Back</Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (isOnline ? "Save Expense" : "Save Locally")}
                    </Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
