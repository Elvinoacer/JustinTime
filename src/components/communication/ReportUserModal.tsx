'use client';

import React, { useState } from 'react';
import { reportUser } from '@/app/actions/reporting';
import { toast } from 'sonner';
import { Loader2, ShieldAlert, X } from 'lucide-react';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  partnerName: string;
}

export function ReportUserModal({
  isOpen,
  onClose,
  reportedId,
  partnerName,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<'HARASSMENT' | 'SCAM' | 'INAPPROPRIATE_CONTENT' | 'SAFETY_CONCERN' | 'SPAM' | 'OTHER'>('HARASSMENT');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await reportUser({
        reportedId,
        reason,
        details,
      });

      if (result.success) {
        toast.success(`Report submitted successfully for ${partnerName}. Our team will review it shortly.`);
        onClose();
      } else {
        toast.error(result.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-2xl shadow-xl z-[101] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3 text-red-600">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            <h2 className="text-lg sm:text-xl font-bold">Report User</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-5 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-5">
            You are reporting <span className="font-semibold text-gray-900">{partnerName}</span>. 
            This information will be kept strictly confidential and reviewed by our Trust & Safety team.
          </p>

          <form id="report-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Reason for reporting
              </label>
              <div className="space-y-2">
                {[
                  { value: 'HARASSMENT', label: 'Harassment or abusive behavior' },
                  { value: 'SCAM', label: 'Suspected scam or fraud' },
                  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
                  { value: 'SAFETY_CONCERN', label: 'Safety concern' },
                  { value: 'SPAM', label: 'Spam' },
                  { value: 'OTHER', label: 'Other' },
                ].map((option) => (
                  <label 
                    key={option.value} 
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      reason === option.value 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-red-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={(e) => setReason(e.target.value as any)}
                      className="text-red-600 focus:ring-red-500 w-4 h-4 touch-manipulation"
                    />
                    <span className={`text-sm ${reason === option.value ? 'font-medium text-red-900' : 'text-gray-700'}`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="details" className="block text-sm font-semibold text-gray-900 mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                id="details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Please provide any contextual information that might help our team investigate..."
                className="w-full text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500 p-3"
              />
            </div>
          </form>
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors touch-manipulation w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="report-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 sm:py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
