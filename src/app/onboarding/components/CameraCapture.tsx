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
    <div className="fixed inset-0 z-50 bg-black/95 p-0 sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-none border-0 bg-black shadow-2xl sm:rounded-xl sm:border sm:border-white/10 md:h-[min(860px,92vh)] md:flex-row md:rounded-2xl">
        <div className="relative min-h-0 flex-1 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover md:object-contain"
          />

          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/25 via-transparent to-black/45" />

          <div className="absolute left-3 top-3 rounded-full border border-white/25 bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
            {guideType === "oval" ? "Selfie" : "ID Photo"}
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
            {guideType === "oval" ? (
              <div className="h-[62%] w-[58%] max-h-[430px] max-w-[320px] rounded-[999px] border-[3px] border-dashed border-white/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
            ) : (
              <div className="h-[36%] w-[84%] max-h-[280px] max-w-[520px] rounded-2xl border-[3px] border-dashed border-white/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
            )}
          </div>
        </div>

        <div className="w-full shrink-0 border-t border-white/10 bg-black/85 p-4 sm:p-5 md:w-[340px] md:border-l md:border-t-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Live camera
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                {guideTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeCamera}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              aria-label="Close camera"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/85">{guidePrompt}</p>

          <div className="mt-3 space-y-1.5 text-xs text-white/65">
            <p className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-400">
                check_circle
              </span>
              Keep the camera steady and avoid blur.
            </p>
            <p className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-400">
                check_circle
              </span>
              Use good lighting for faster verification.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row md:flex-col">
            <button
              onClick={capture}
              disabled={!isStreamReady}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-gray-900 shadow-lg transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-lg">
                photo_camera
              </span>
              {isStreamReady ? "Capture" : "Preparing camera..."}
            </button>
            <button
              onClick={closeCamera}
              className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-3 font-bold text-white transition-colors hover:bg-white/15"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
