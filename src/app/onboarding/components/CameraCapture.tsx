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
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);

  const stopActiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopActiveStream();
    onClose();
  }, [onClose, stopActiveStream]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setIsStreamReady(false);
    stopActiveStream();

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = async () => {
            if (cancelled) return;
            try {
              await videoRef.current?.play();
            } catch {
              // Ignore autoplay errors and still show stream controls.
            }
            setIsStreamReady(true);
          };
        }
      })
      .catch(() => {
        setIsStreamReady(false);
        setError("Camera not available. Please use file upload instead.");
      });

    return () => {
      cancelled = true;
      stopActiveStream();
    };
  }, [facingMode, stopActiveStream]);

  const capture = useCallback(() => {
    if (!videoRef.current || !isStreamReady) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    if (!canvas.width || !canvas.height) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          stopActiveStream();
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.92,
    );
  }, [isStreamReady, onCapture, stopActiveStream]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 px-4 py-6 sm:p-6">
        <div className="mx-auto flex h-full max-w-lg items-center justify-center">
          <div className="w-full rounded-2xl border border-white/15 bg-neutral-900 p-6 text-center shadow-2xl">
            <span className="material-symbols-outlined mb-4 text-5xl text-red-400">
              videocam_off
            </span>
            <p className="mb-2 text-lg font-bold text-white">
              Camera unavailable
            </p>
            <p className="mb-6 text-sm text-gray-300">{error}</p>
            <button
              onClick={closeCamera}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-6 py-3 font-bold text-gray-900 transition-colors hover:bg-gray-100"
            >
              Use file upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  const guideTitle =
    guideType === "oval" ? "Take a clear selfie" : "Capture your ID";
  const guidePrompt =
    guideType === "oval"
      ? "Look straight ahead and center your face inside the oval."
      : "Hold your ID flat, keep all corners visible, and avoid glare.";

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/45 via-black/10 to-black/70" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-3 sm:px-5 sm:py-4">
        <div className="rounded-full border border-white/25 bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
          {guideType === "oval" ? "Selfie" : "ID Photo"}
        </div>
        <button
          type="button"
          onClick={closeCamera}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white/85 transition-colors hover:bg-black/60 hover:text-white"
          aria-label="Close camera"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[17%] bottom-[24%] flex items-center justify-center px-4 sm:top-[14%] sm:bottom-[26%] md:top-[12%] md:bottom-[28%]">
        {guideType === "oval" ? (
          <div className="h-[78%] w-[72%] max-h-[420px] max-w-[300px] rounded-[999px] border-[3px] border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.24)] sm:h-[84%] sm:w-[68%]" />
        ) : (
          <div className="h-[38%] w-[90%] max-h-[280px] max-w-[560px] rounded-2xl border-[3px] border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.24)] sm:h-[42%] sm:w-[88%]" />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-black/72 p-3 backdrop-blur md:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Live camera
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                {guideTitle}
              </h3>
            </div>
            {!isStreamReady ? (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                Preparing...
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm leading-6 text-white/85">{guidePrompt}</p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <button
              onClick={capture}
              disabled={!isStreamReady}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-gray-900 shadow-lg transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">
                photo_camera
              </span>
              {isStreamReady ? "Capture" : "Preparing camera..."}
            </button>
            <button
              onClick={closeCamera}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 py-3 font-bold text-white transition-colors hover:bg-white/15"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
