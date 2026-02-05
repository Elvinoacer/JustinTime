"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
// @ts-ignore
import SimplePeer from "simple-peer";
import VideoCallInterface from "./VideoCallInterface";
// @ts-ignore
import { io } from "socket.io-client";
import { logCallStart, logCallStatus } from "@/app/actions/calls";
import { toast } from "sonner";
import { Phone, Video, Loader2 } from "lucide-react";

// Global event bus for triggering calls from other components
export const callEvents = new EventTarget();

export function toggleCall(userId: string, userName: string, userImage: string | null, type: 'AUDIO' | 'VIDEO' = 'VIDEO') {
  const event = new CustomEvent('initiate_call', {
    detail: { userId, userName, userImage, type }
  });
  callEvents.dispatchEvent(event);
}

export default function CallOverlay() {
  const { data: session } = useSession();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [partnerStream, setPartnerStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<"idle" | "incoming" | "calling" | "ongoing">("idle");
  const [callType, setCallType] = useState<"AUDIO" | "VIDEO">("VIDEO");
  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("");
  const [partnerImage, setPartnerImage] = useState<string | null>(null);
  const [incomingCallSignal, setIncomingCallSignal] = useState<any>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const socket = useRef<any>(null);
  const peer = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket
  useEffect(() => {
    if (session?.user?.id) {
        // Assume socket server is on the same host or configured env
        // Using same logic as messages page
        fetch("/api/socket").finally(() => {
            socket.current = io({ 
                path: "/api/socket/io", // Adjust if using custom server paths or root
                // For this project structure it seems socket.io is on root port 4000 or via custom server
                // Since server.js runs separately, we might need absolute URL if not proxied
            });
            
            // Try connecting to the port 4000 directly if relative fails, or rely on existing socket setup
            // Assuming local dev environment pattern from server.js
            if (!socket.current.connected) {
                 socket.current = io("http://localhost:4000"); // Fallback for dev
            }
            
            socket.current.on("connect", () => {
                socket.current.emit("join", session.user.id);
            });

            socket.current.on("call_user", (data: any) => {
                setCallStatus("incoming");
                setPartnerId(data.from);
                setPartnerName(data.name || "Unknown User");
                setIncomingCallSignal(data.signal);
                setCallType(data.callType || "VIDEO");
                // Play ringtone here if needed
            });

            socket.current.on("call_accepted", (signal: any) => {
                setCallStatus("ongoing");
                peer.current.signal(signal);
                startTimer();
                // Update DB status
                if (currentCallId) logCallStatus(currentCallId, "ONGOING");
            });

            socket.current.on("call_rejected", () => {
                toast.error("Call rejected");
                endCall("REJECTED");
            });

            socket.current.on("call_ended", () => {
                endCall("ENDED");
            });

            socket.current.on("ice_candidate", (data: any) => {
                if (peer.current) {
                    peer.current.signal(data.candidate);
                }
            });
        });
    }

    return () => {
        if(socket.current) socket.current.disconnect();
        if(timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  // Listen for outgoing call events
  useEffect(() => {
    const handleInitiateCall = (e: any) => {
        const { userId, userName, userImage, type } = e.detail;
        initiateCall(userId, userName, userImage, type);
    };

    callEvents.addEventListener('initiate_call', handleInitiateCall);
    return () => callEvents.removeEventListener('initiate_call', handleInitiateCall);
  }, [session]);

  const startTimer = () => {
      setCallDuration(0);
      if(timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
      }, 1000);
  };

  const getMediaStream = async (type: "AUDIO" | "VIDEO") => {
      try {
          const currentStream = await navigator.mediaDevices.getUserMedia({
              video: type === "VIDEO",
              audio: true
          });
          setStream(currentStream);
          return currentStream;
      } catch (err) {
          console.error("Failed to get media stream:", err);
          toast.error("Could not access camera/microphone");
          return null;
      }
  };

  const initiateCall = async (id: string, name: string, image: string | null, type: "AUDIO" | "VIDEO") => {
      if (!session?.user?.id) return;
      
      setPartnerId(id);
      setPartnerName(name);
      setPartnerImage(image);
      setCallType(type);
      setCallStatus("calling");

      const currentStream = await getMediaStream(type);
      if (!currentStream) {
          setCallStatus("idle");
          return;
      }

      // Log call in DB
      const logRes = await logCallStart(id, type);
      if (logRes.success && logRes.callId) {
          setCurrentCallId(logRes.callId);
      }

      const p = new SimplePeer({
          initiator: true,
          trickle: false,
          stream: currentStream,
      });

      p.on("signal", (data: any) => {
          socket.current.emit("call_user", {
              userToCall: id,
              signalData: data,
              from: session.user.id,
              name: session.user.name,
              callType: type
          });
      });

      p.on("stream", (remoteStream: MediaStream) => {
          setPartnerStream(remoteStream);
      });

      p.on("close", () => {
          endCall();
      });

      peer.current = p;
  };

  const answerCall = async () => {
      setCallStatus("ongoing");
      startTimer();
      
      const currentStream = await getMediaStream(callType);
      
      const p = new SimplePeer({
          initiator: false,
          trickle: false,
          stream: currentStream || undefined,
      });

      p.on("signal", (data: any) => {
          socket.current.emit("answer_call", { signal: data, to: partnerId });
      });

      p.on("stream", (remoteStream: MediaStream) => {
          setPartnerStream(remoteStream);
      });

      p.signal(incomingCallSignal);
      peer.current = p;
  };

  const rejectCall = () => {
      socket.current.emit("reject_call", { to: partnerId });
      setCallStatus("idle");
      // Could log missed/rejected here if we had the call ID from the signal
  };

  const endCall = (status: any = "ENDED") => {
      if (socket.current && partnerId) {
          socket.current.emit("end_call", { to: partnerId });
      }
      
      if (currentCallId) {
          logCallStatus(currentCallId, status === "REJECTED" ? "REJECTED" : "ENDED");
          setCurrentCallId(null);
      }

      if (peer.current) {
          peer.current.destroy();
          peer.current = null;
      }

      if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
      }
      
      setPartnerStream(null);
      setCallStatus("idle");
      setPartnerId("");
      if(timerRef.current) clearInterval(timerRef.current);
  };

  const toggleMic = () => {
      if (stream) {
          stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
          setIsMicMuted(!isMicMuted);
      }
  };

  const toggleVideo = () => {
      if (stream) {
          stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
          setIsVideoMuted(!isVideoMuted);
      }
  };

  if (callStatus === "idle") return null;

  if (callStatus === "incoming") {
      return (
          <div className="fixed top-4 right-4 z-[70] animate-in slide-in-from-top-5 w-80">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-4 ring-1 ring-black/5">
                  <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            {partnerImage ? (
                                <img src={partnerImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-slate-400">{partnerName[0]}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{partnerName}</h3>
                            <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Incoming {callType.toLowerCase()} call...
                            </p>
                        </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                         onClick={rejectCall}
                         className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold transition-colors"
                      >
                          <Phone className="w-4 h-4" />
                          Decline
                      </button>
                      <button 
                         onClick={answerCall}
                         className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                      >
                          {callType === 'VIDEO' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          Answer
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
      <VideoCallInterface
          stream={stream}
          partnerStream={partnerStream}
          callStatus={callStatus}
          callType={callType}
          onEndCall={endCall}
          partnerName={partnerName}
          partnerImage={partnerImage}
          isCaller={callStatus === 'calling'}
          toggleMic={toggleMic}
          toggleVideo={toggleVideo}
          isMicMuted={isMicMuted}
          isVideoMuted={isVideoMuted}
          duration={callDuration}
      />
  );
}
