"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  facingMode?: "user" | "environment";
  guideType?: "oval" | "card";
}

export default function CameraCapture({
  onCapture,
  onClose,
  facingMode = "user",
  guideType = "oval",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {
        setError("Camera not available. Please use file upload instead.");
      });

    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const capture = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Stop stream before calling onCapture
          stream?.getTracks().forEach((t) => t.stop());
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  }, [onCapture, stream]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-red-400 text-5xl mb-4">
          videocam_off
        </span>
        <p className="text-white text-lg font-bold mb-2">Camera Unavailable</p>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors"
        >
          Use File Upload
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Video feed */}
      <div className="relative w-full max-w-lg mx-auto">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-xl"
        />
        {/* Guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {guideType === "oval" ? (
            <div className="w-48 h-64 sm:w-56 sm:h-72 border-[3px] border-dashed border-white/60 rounded-[50%]" />
          ) : (
            <div className="w-72 h-44 sm:w-80 sm:h-52 border-[3px] border-dashed border-white/60 rounded-xl" />
          )}
        </div>
      </div>

      {/* Prompt */}
      <p className="text-white/80 text-sm mt-4 mb-2 text-center px-4">
        {guideType === "oval"
          ? "Look straight ahead, ensure your face fills the oval"
          : "Hold your ID flat, ensure all corners are visible"}
      </p>

      {/* Controls */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={capture}
          className="px-8 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg"
        >
          <span className="material-symbols-outlined">photo_camera</span>
          Capture
        </button>
        <button
          onClick={() => {
            stream?.getTracks().forEach((t) => t.stop());
            onClose();
          }}
          className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
