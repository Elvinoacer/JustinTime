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
  isMobile?: boolean;
}

const ImageCropper = ({
  image,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  isMobile = false,
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deviceIsMobile, setDeviceIsMobile] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [objectFit, setObjectFit] = useState<"contain" | "cover" | "horizontal-cover" | "vertical-cover">("vertical-cover");

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setDeviceIsMobile(window.innerWidth < 768);
      setIsCompactViewport(window.innerHeight < 820);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const finalIsMobile = isMobile || deviceIsMobile;
  const showManualPositionControls = !finalIsMobile && !isCompactViewport;
  const showQuickPositionButtons = finalIsMobile || isCompactViewport;

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
  }, [isProcessing, onCancel]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Helper function for quick zoom
  const handleQuickZoom = (level: number) => {
    setZoom(level);
  };

  // Helper function for quick reset
  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div
      className={`fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center ${
        finalIsMobile ? "p-0" : "p-2 sm:p-3 md:p-4"
      }`}
    >
      {/* Backdrop click handler */}
      <div className="absolute inset-0" onClick={onCancel} aria-hidden="true" />

      <div
        className={`bg-white rounded-none sm:rounded-xl md:rounded-2xl w-full ${
          finalIsMobile
            ? "h-[100dvh] max-h-[100dvh] rounded-none"
            : "max-w-xs xs:max-w-sm sm:max-w-md md:max-w-2xl max-h-[95dvh]"
        } overflow-y-auto flex flex-col relative z-10`}
      >
        {/* Header */}
        <div
          className={`border-b border-gray-200 flex-shrink-0 ${
            finalIsMobile ? "p-4" : "p-3 sm:p-4 md:p-6"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2
                className={`font-semibold text-gray-900 truncate ${
                  finalIsMobile ? "text-lg" : "text-base sm:text-lg md:text-xl"
                }`}
              >
                Crop Profile Picture
              </h2>
              <p
                className={`text-gray-600 mt-0.5 sm:mt-1 ${
                  finalIsMobile ? "text-sm" : "text-xs sm:text-sm"
                }`}
              >
                Adjust the image position and zoom to your liking
              </p>
            </div>
            <button
              onClick={onCancel}
              className={`text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0 ${
                finalIsMobile ? "p-2" : "p-1.5 sm:p-2"
              }`}
              aria-label="Close cropper"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Cropper Area */}
        <div
          className="relative flex-shrink-0 w-full bg-black overflow-hidden"
          style={{
            height: finalIsMobile ? "45dvh" : isCompactViewport ? "42vh" : "60vh",
            maxHeight: finalIsMobile ? "360px" : isCompactViewport ? "420px" : "500px",
            minHeight: finalIsMobile ? "180px" : isCompactViewport ? "240px" : "300px",
          }}
        >
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
                showGrid={!finalIsMobile}
                objectFit={objectFit}
                restrictPosition={true}
                style={{
                  containerStyle: {
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "black",
                  },
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
        <div
          className={`border-t border-gray-200 flex-shrink-0 ${
            finalIsMobile ? "p-4" : "p-3 sm:p-4 md:p-6"
          }`}
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Two-column layout for desktop, single column for mobile */}
            <div
              className={`${
                finalIsMobile
                  ? "space-y-3"
                  : "grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
              }`}
            >
              {/* Zoom Controls */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                    <span className="material-symbols-outlined text-base sm:text-lg">
                      zoom_in
                    </span>
                    <span
                      className={
                        finalIsMobile ? "text-sm" : "text-xs sm:text-sm"
                      }
                    >
                      Zoom Level
                    </span>
                  </label>
                  <span
                    className={`font-mono bg-gray-100 px-2 py-0.5 rounded ${
                      finalIsMobile ? "text-sm" : "text-xs sm:text-sm"
                    }`}
                  >
                    {zoom.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  aria-label="Zoom slider"
                />
                <div
                  className={`flex justify-between text-gray-500 mt-0.5 ${
                    finalIsMobile ? "text-xs" : "text-[10px] sm:text-xs"
                  }`}
                >
                  <span>0.1x</span>
                  <span>1x</span>
                  <span>2x</span>
                  <span>3x</span>
                </div>
              </div>

              {/* Position Controls - Hidden on mobile if too cramped */}
              {showManualPositionControls && (
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="font-medium text-gray-900 flex items-center gap-1.5 sm:gap-2">
                    <span className="material-symbols-outlined text-base sm:text-lg">
                      crop
                    </span>
                    <span className="text-xs sm:text-sm">Manual Position</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        Horizontal (X)
                      </span>
                      <input
                        type="range"
                        min={-100}
                        max={100}
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
                        min={-100}
                        max={100}
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
              )}
            </div>

            {/* Quick Action Buttons - For mobile touch */}
            {showQuickPositionButtons && (
              <div className="space-y-3 pt-1">
                {/* Quick Zoom Buttons */}
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => handleQuickZoom(1)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                      zoom === 1
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => handleQuickZoom(1.5)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                      zoom === 1.5
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    1.5x
                  </button>
                  <button
                    onClick={() => handleQuickZoom(2)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                      zoom === 2
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    2x
                  </button>
                  <button
                    onClick={() => handleQuickZoom(2.5)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                      zoom === 2.5
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    2.5x
                  </button>
                </div>

                {/* Quick Position Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleReset}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      restart_alt
                    </span>
                    Reset
                  </button>
                  <button
                    onClick={() => setCrop((prev) => ({ ...prev, x: -20 }))}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      arrow_left
                    </span>
                    Left
                  </button>
                  <button
                    onClick={() => setCrop((prev) => ({ ...prev, x: 20 }))}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">
                      arrow_right
                    </span>
                    Right
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div
              className={`flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 ${
                finalIsMobile ? "pt-2" : "pt-1 sm:pt-2"
              } sticky bottom-0 bg-white`}
            >
              <button
                onClick={onCancel}
                className={`bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors active:scale-[0.98] disabled:opacity-50 ${
                  finalIsMobile
                    ? "flex-1 px-4 py-3 text-base min-h-[48px]"
                    : "flex-1 xs:flex-none px-4 py-2.5 sm:py-3 text-sm sm:text-base min-h-[44px]"
                }`}
                disabled={isProcessing}
              >
                Cancel
              </button>
              
               <button
                onClick={() => setObjectFit(prev => prev === "contain" ? "cover" : "contain")}
                className={`bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 ${
                  finalIsMobile
                    ? "flex-1 px-4 py-3 text-base min-h-[48px]"
                    : "flex-1 xs:flex-none px-4 py-2.5 sm:py-3 text-sm sm:text-base min-h-[44px]"
                }`}
              >
                 <span className="material-symbols-outlined text-sm sm:text-base">
                   {objectFit === "contain" ? "zoom_out_map" : "fit_screen"}
                 </span>
                 {objectFit === "contain" ? "Fill Frame" : "Fit Image"}
              </button>

              <button
                onClick={handleCropImage}
                disabled={isProcessing || !croppedAreaPixels}
                className={`bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  finalIsMobile
                    ? "flex-1 px-4 py-3 text-base min-h-[48px]"
                    : "flex-1 xs:flex-none px-4 py-2.5 sm:py-3 text-sm sm:text-base min-h-[44px]"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div
                      className={`border-2 border-white/30 border-t-white rounded-full animate-spin ${
                        finalIsMobile ? "w-5 h-5" : "w-4 h-4"
                      }`}
                    />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm sm:text-base">
                      check_circle
                    </span>
                    <span>
                      {finalIsMobile ? "Apply & Save" : "Apply & Upload"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Mobile Tips */}
            {finalIsMobile && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  💡 Pinch to zoom, drag to move the image
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile-only swipe indicator */}
        {finalIsMobile && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/70 animate-bounce">
            <span className="material-symbols-outlined text-3xl">swipe_up</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to crop the image
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Ensure pixel crop values are properly rounded and bounded
  const cropX = Math.max(0, Math.round(pixelCrop.x));
  const cropY = Math.max(0, Math.round(pixelCrop.y));
  const cropWidth = Math.min(
    Math.round(pixelCrop.width),
    image.width - cropX
  );
  const cropHeight = Math.min(
    Math.round(pixelCrop.height),
    image.height - cropY
  );

  console.log('Crop Debug Info:', {
    imageDimensions: { width: image.width, height: image.height },
    requestedCrop: pixelCrop,
    actualCrop: { x: cropX, y: cropY, width: cropWidth, height: cropHeight }
  });

  // Set canvas size to the desired crop size
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  // If no rotation, we can use a simpler approach
  if (rotation === 0 && !flip.horizontal && !flip.vertical) {
    // Draw the cropped portion of the image directly
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );
  } else {
    // Handle rotation and flipping
    const rotRad = getRadianAngle(rotation);

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    );

    // Temporarily set canvas to full image size for rotation
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) throw new Error("Failed to get temp canvas context");

    tempCanvas.width = bBoxWidth;
    tempCanvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    tempCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
    tempCtx.rotate(rotRad);
    tempCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    tempCtx.translate(-image.width / 2, -image.height / 2);

    // draw rotated image
    tempCtx.drawImage(image, 0, 0);

    // extract the cropped image from the rotated image
    const data = tempCtx.getImageData(
      cropX,
      cropY,
      cropWidth,
      cropHeight
    );

    // paste cropped data to final canvas
    ctx.putImageData(data, 0, 0);
  }

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          console.log('Cropped blob created:', { size: blob.size, type: blob.type });
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

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
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
