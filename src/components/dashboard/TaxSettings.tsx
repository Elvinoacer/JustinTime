
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { verifyAndSaveKraDetails, fileNilReturnAction } from "@/app/actions/tax";
import { useRouter } from "next/navigation";

interface TaxSettingsProps {
  initialData: {
    kraPin?: string | null;
    tccNumber?: string | null;
    kraVerified: boolean;
    tccExpiry?: Date | null;
  };
  filings?: any[];
}

export default function TaxSettings({ initialData, filings = [] }: TaxSettingsProps) {
  const router = useRouter();
  const [pin, setPin] = useState(initialData.kraPin || "");
  const [tcc, setTcc] = useState(initialData.tccNumber || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFiling, setIsFiling] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyAndSaveKraDetails(pin, tcc);
      if (result.success) {
        toast.success("Tax details verified and saved!");
        router.refresh();
      } else {
        toast.error(result.error || "Verification failed");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileNilReturn = async () => {
    setIsFiling(true);
    try {
        // Auto-select current month or previous month
        const today = new Date();
        const period = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const result = await fileNilReturnAction(period);
        if (result.success) {
            toast.success(`Nil Return filed! Ack: ${result.ackNumber}`);
            router.refresh();
        } else {
            toast.error(result.error);
        }
    } catch (e) {
        toast.error("Filing failed");
    } finally {
        setIsFiling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">account_balance</span>
            KRA GavaConnect Integration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">KRA PIN</label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="A000000000Z"
                        disabled={initialData.kraVerified} // Allow edit? Maybe locked if verified
                        className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                    />
                     {initialData.kraVerified && (
                        <span className="absolute right-3 top-2 text-emerald-600 material-symbols-outlined text-lg">check_circle</span>
                    )}
                </div>
            </div>
            
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tax Compliance Cert (TCC)</label>
                 <div className="relative">
                    <input 
                        type="text" 
                        value={tcc}
                        onChange={(e) => setTcc(e.target.value)}
                        placeholder="KRA/TCC/..."
                        className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                </div>
            </div>
        </div>
        
        <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
                {initialData.kraVerified ? "Your tax details are verified." : "Please verify your tax status."}
            </div>
            <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
                {isVerifying ? "Verifying..." : "Verify & Save"}
            </button>
        </div>
      </div>

      {initialData.kraVerified && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Tax Filing Center</h3>
                    <p className="text-sm text-gray-500">Simplify your monthly returns</p>
                </div>
                <button
                    onClick={handleFileNilReturn}
                    disabled={isFiling}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined">send</span>
                    {isFiling ? "Filing..." : "File Nil Return"}
                </button>
             </div>
             
             <h4 className="font-semibold text-gray-800 mb-3">Recent Filings</h4>
             {filings.length === 0 ? (
                 <p className="text-gray-500 italic">No filings recorded.</p>
             ) : (
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                         <thead className="bg-gray-50 text-gray-600 font-medium">
                             <tr>
                                 <th className="p-3">Period</th>
                                 <th className="p-3">Type</th>
                                 <th className="p-3">Status</th>
                                 <th className="p-3">Ack Number</th>
                                 <th className="p-3">Date</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {filings.map(filing => (
                                 <tr key={filing.id}>
                                     <td className="p-3 font-medium">{filing.period}</td>
                                     <td className="p-3">{filing.type}</td>
                                     <td className="p-3">
                                         <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs">
                                             {filing.status}
                                         </span>
                                     </td>
                                     <td className="p-3 font-mono text-gray-500">{filing.ackNumber}</td>
                                     <td className="p-3 text-gray-500">{new Date(filing.createdAt).toLocaleDateString()}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             )}
          </div>
      )}
    </div>
  );
}
