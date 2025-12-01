"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const ImageCropper = ({
  image,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCropImage = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      if (e.key === "Enter" && !isProcessing) {
        handleCropImage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, onCancel, handleCropImage]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-2 xs:p-3 sm:p-4">
      <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl w-full max-w-xs xs:max-w-sm sm:max-w-md md:max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
                Crop Profile Picture
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                Adjust the image position and zoom to your liking
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 sm:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0"
              aria-label="Close cropper"
            >
              <span className="material-symbols-outlined text-sm sm:text-base">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 min-h-0 bg-black w-full overflow-hidden">
          {image ? (
            <div className="absolute inset-0">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onCropComplete={onCropCompleteCallback}
                cropShape="round"
                showGrid={!isMobile} // Hide grid on mobile for cleaner view
                objectFit="contain"
                style={{
                  containerStyle: {
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "black",
                  },
                }}
                classes={{
                  containerClassName: "!relative",
                  mediaClassName: "!max-w-none !max-h-none",
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white text-sm sm:text-base">
              No image selected
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-3 sm:p-4 md:p-6 border-t border-gray-200 flex-shrink-0">
          {/* Two-column layout for controls on larger screens */}
          <div className="space-y-3 sm:space-y-4">
            {/* Zoom Controls - Two columns on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                    <span className="material-symbols-outlined text-base sm:text-lg">
                      zoom_in
                    </span>
                    <span>Zoom Level</span>
                  </label>
                  <span className="text-xs sm:text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  aria-label="Zoom slider"
                />
                <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-0.5">
                  <span>1x</span>
                  <span>1.5x</span>
                  <span>2x</span>
                  <span>2.5x</span>
                  <span>3x</span>
                </div>
              </div>

              {/* Position Controls - Second column on desktop */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                  <span className="material-symbols-outlined text-base sm:text-lg">
                    crop
                  </span>
                  <span>Manual Position</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      Horizontal (X)
                    </span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={crop.x}
                      onChange={(e) =>
                        setCrop((prev) => ({
                          ...prev,
                          x: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      aria-label="Horizontal position"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] sm:text-xs text-gray-500">
                      Vertical (Y)
                    </span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={crop.y}
                      onChange={(e) =>
                        setCrop((prev) => ({
                          ...prev,
                          y: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      aria-label="Vertical position"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs text-gray-500">
                  <span>Left</span>
                  <span>Center</span>
                  <span>Right</span>
                </div>
              </div>
            </div>

            {/* Quick Zoom Buttons - For mobile touch */}
            {isMobile && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => setZoom((prev) => Math.max(1, prev - 0.5))}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors active:scale-95"
                  aria-label="Zoom out"
                >
                  <span className="material-symbols-outlined text-sm">
                    remove
                  </span>
                </button>
                <button
                  onClick={() => setZoom(1.5)}
                  className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-colors active:scale-95"
                >
                  1.5x
                </button>
                <button
                  onClick={() => setZoom(2)}
                  className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-colors active:scale-95"
                >
                  2x
                </button>
                <button
                  onClick={() => setZoom((prev) => Math.min(3, prev + 0.5))}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors active:scale-95"
                  aria-label="Zoom in"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            )}

            {/* Action Buttons - Stacked on mobile, side by side on larger */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
              <button
                onClick={onCancel}
                className="flex-1 xs:flex-none px-4 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors active:scale-[0.98] text-sm sm:text-base min-h-[44px]"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleCropImage}
                disabled={isProcessing || !croppedAreaPixels}
                className="flex-1 xs:flex-none px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="hidden xs:inline">Processing...</span>
                    <span className="inline xs:hidden">Processing</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm sm:text-base">
                      check_circle
                    </span>
                    <span className="hidden xs:inline">Apply & Upload</span>
                    <span className="inline xs:hidden">Apply</span>
                  </>
                )}
              </button>
            </div>

            {/* Tips for mobile users */}
            {isMobile && (
              <div className="text-center pt-1">
                <p className="text-[10px] sm:text-xs text-gray-500">
                  💡 Pinch to zoom, drag to move the image
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to crop the image
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Set canvas size to match the cropped area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/jpeg",
      0.95
    );
  });
}

// Helper function to create an image element from a source
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

export default ImageCropper;
