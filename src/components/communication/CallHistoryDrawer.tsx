'use client';

import React, { useEffect, useState } from 'react';
import { getCallHistory } from '@/app/actions/calls';
import { Phone, Video, X, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface CallHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
}

export function CallHistoryDrawer({
  isOpen,
  onClose,
  partnerId,
  partnerName,
}: CallHistoryDrawerProps) {
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && partnerId) {
      loadHistory();
    }
  }, [isOpen, partnerId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await getCallHistory(partnerId);
      if (res.success && res.calls) {
        setCalls(res.calls);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getCallIcon = (type: string, status: string, isIncoming: boolean) => {
    const Icon = type === 'VIDEO' ? Video : Phone;
    let colorClass = 'text-gray-500';
    
    if (status === 'MISSED' || status === 'REJECTED') {
      colorClass = 'text-red-500';
    } else if (isIncoming) {
      colorClass = 'text-blue-500';
    } else {
      colorClass = 'text-green-500';
    }

    return <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colorClass}`} />;
  };

  const getStatusText = (status: string, isIncoming: boolean) => {
    if (status === 'MISSED') return 'Missed call';
    if (status === 'REJECTED') return 'Declined call';
    return isIncoming ? 'Incoming call' : 'Outgoing call';
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} sec`;
    return `${mins} min ${secs} sec`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-[101] flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Call History</h2>
            <p className="text-xs text-gray-500 mt-0.5">with {partnerName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {isLoading ? (
            <div className="py-10 text-center text-gray-400 flex flex-col items-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Loading call records...</p>
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-10 text-gray-400 flex flex-col items-center">
              <Phone className="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 mb-3" />
              <p className="text-sm sm:text-base font-medium">No call history</p>
              <p className="text-xs sm:text-sm mt-1">You haven't called {partnerName} yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => {
                const isIncoming = call.receiverId === partnerId ? false : true;
                
                // Calculate duration if not provided but we have start/end
                let calculatedDuration = call.duration;
                if (!calculatedDuration && call.startedAt && call.endedAt) {
                  calculatedDuration = Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000);
                }

                return (
                  <div key={call.id} className="flex items-start justify-between p-3 sm:p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`mt-0.5 p-2 rounded-full ${call.status === 'MISSED' || call.status === 'REJECTED' ? 'bg-red-50' : 'bg-gray-50'}`}>
                        {getCallIcon(call.type, call.status, isIncoming)}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${call.status === 'MISSED' || call.status === 'REJECTED' ? 'text-red-600' : 'text-gray-900'}`}>
                          {getStatusText(call.status, isIncoming)}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(call.createdAt), 'MMM d, h:mm a')}
                          </span>
                          {calculatedDuration > 0 && (
                            <span className="hidden sm:inline">•</span>
                          )}
                          {calculatedDuration > 0 && (
                            <span>{formatDuration(calculatedDuration)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center flex items-center justify-center gap-2">
           <AlertCircle className="w-4 h-4 text-emerald-500" />
           <p>Calls are end-to-end encrypted. Audio/video is never stored.</p>
        </div>
      </div>
    </>
  );
}
