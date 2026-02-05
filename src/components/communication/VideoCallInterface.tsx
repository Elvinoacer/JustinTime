"use client";

import { useEffect, useRef, useState } from "react";
// @ts-ignore
import SimplePeer from "simple-peer";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { format } from "date-fns";

interface VideoCallInterfaceProps {
  stream: MediaStream | null;
  partnerStream: MediaStream | null;
  callStatus: string; // 'calling', 'ongoing', 'ended'
  callType: "AUDIO" | "VIDEO";
  onEndCall: () => void;
  partnerName: string;
  partnerImage?: string | null;
  isCaller: boolean;
  toggleMic: () => void;
  toggleVideo: () => void;
  isMicMuted: boolean;
  isVideoMuted: boolean;
  duration?: number;
}

export default function VideoCallInterface({
  stream,
  partnerStream,
  callStatus,
  callType,
  onEndCall,
  partnerName,
  partnerImage,
  isCaller,
  toggleMic,
  toggleVideo,
  isMicMuted,
  isVideoMuted,
  duration = 0,
}: VideoCallInterfaceProps) {
  const userVideo = useRef<HTMLVideoElement>(null);
  const partnerVideo = useRef<HTMLVideoElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (stream && userVideo.current) {
      userVideo.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (callStatus === "ongoing" && partnerStream && partnerVideo.current) {
      partnerVideo.current.srcObject = partnerStream;
    }
  }, [partnerStream, callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3 flex items-center gap-3 w-64 border border-slate-700">
          <div className="relative">
             {partnerImage ? (
                <img src={partnerImage} alt="" className="w-10 h-10 rounded-full object-cover" />
             ) : (
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-sm">
                   {partnerName[0]}
                </div>
             )}
             <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-sm font-semibold truncate">{partnerName}</p>
             <p className="text-xs text-emerald-400 font-mono">{formatDuration(duration)}</p>
          </div>
          <button 
             onClick={() => setIsMinimized(false)}
             className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
             <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-start">
         <div className="flex items-center gap-3 text-white">
            <div className="flex flex-col">
               <h3 className="font-bold text-lg drop-shadow-md">{partnerName}</h3>
               <span className="text-sm text-white/80 font-mono drop-shadow-md flex items-center gap-2">
                  {callStatus === "calling" ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {isCaller ? "Calling..." : "Connecting..."}
                      </>
                  ) : (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        {formatDuration(duration)}
                      </>
                  )}
               </span>
            </div>
         </div>
         <button 
            onClick={() => setIsMinimized(true)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"
         >
            <Minimize2 className="w-6 h-6" />
         </button>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden flex items-center justify-center">
        {/* Partner Video (Main) */}
        {callType === "VIDEO" && callStatus === "ongoing" && partnerStream ? (
          <video
            playsInline
            ref={partnerVideo}
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 animate-pulse">
             <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 shadow-2xl">
                 {partnerImage ? (
                    <img src={partnerImage} alt="" className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-500">
                       {partnerName[0]}
                    </div>
                 )}
             </div>
             <p className="text-slate-400 text-lg font-medium">
               {callStatus === "calling" ? (isCaller ? "Calling..." : "Ringing...") : "Voice Call"}
             </p>
          </div>
        )}

        {/* User Video (PIP) */}
        {callType === "VIDEO" && (
          <div className="absolute bottom-24 right-4 w-32 sm:w-48 aspect-[3/4] bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
            <video
              playsInline
              muted
              ref={userVideo}
              autoPlay
              className="w-full h-full object-cover mirror-mode" 
            />
            {(!stream || isVideoMuted) && (
               <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <VideoOff className="w-8 h-8 text-slate-600" />
               </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-24 bg-slate-900 flex items-center justify-center gap-6 pb-6 pt-2">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full transition-all duration-200 ${
            isMicMuted ? "bg-white text-slate-900 hover:bg-slate-200" : "bg-slate-800 text-white hover:bg-slate-700"
          }`}
        >
          {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {callType === "VIDEO" && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all duration-200 ${
              isVideoMuted ? "bg-white text-slate-900 hover:bg-slate-200" : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        <button
          onClick={onEndCall}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-red-500/20"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      <style jsx>{`
        .mirror-mode {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
