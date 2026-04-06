"use client";

import Link from "next/link";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { bearingToCompass, formatDistance } from "@/lib/utils/geolocation";

type RadarEntityType = "job" | "service" | "professional";

export interface RadarBrowseItem {
  id: string;
  href: string;
  name: string;
  subtitle?: string | null;
  type: RadarEntityType;
  typeLabel?: string | null;
  colorKey?: string | null;
  distanceKm: number;
  bearingDeg: number;
}

interface RadarBrowseProps {
  title: string;
  description: string;
  items: RadarBrowseItem[];
  hasUserLocation: boolean;
  allowedTypes?: RadarEntityType[];
  autoFullscreenOnMount?: boolean;
}

const RADAR_COLORS = [
  "#38bdf8",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#f43f5e",
  "#14b8a6",
  "#fb7185",
  "#84cc16",
  "#60a5fa",
  "#f97316",
];

function colorFromKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % RADAR_COLORS.length;
  return RADAR_COLORS[index];
}

function itemTypeLabel(item: RadarBrowseItem) {
  const label = item.typeLabel?.trim();
  return label && label.length > 0 ? label : "General";
}

function pointPosition(
  distanceKm: number,
  bearingDeg: number,
  maxDistanceKm: number,
) {
  const radiusPct = (Math.min(distanceKm, maxDistanceKm) / maxDistanceKm) * 44;
  const angle = ((bearingDeg - 90) * Math.PI) / 180;
  return {
    x: 50 + radiusPct * Math.cos(angle),
    y: 50 + radiusPct * Math.sin(angle),
  };
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LabelPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type DeviceOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const RADAR_LAYOUT_SIZE = 560;
const RADAR_LABEL_WIDTH = 176;
const RADAR_LABEL_HEIGHT = 48;
const RADAR_LABEL_PADDING = 6;
const MIN_DISTANCE_KM = 1;
const HEADING_MIN_STEP_DEG = 0.4;
const HEADING_LABEL_STEP_DEG = 2;
const HEADING_LABEL_UPDATE_INTERVAL_MS = 150;

function rectsIntersect(a: Rect, b: Rect) {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

function overlapCount(candidate: Rect, occupied: Rect[]) {
  let count = 0;
  for (const existing of occupied) {
    if (rectsIntersect(candidate, existing)) {
      count += 1;
    }
  }
  return count;
}

function isWithinRadar(rect: Rect, size: number) {
  return (
    rect.left >= RADAR_LABEL_PADDING &&
    rect.top >= RADAR_LABEL_PADDING &&
    rect.left + rect.width <= size - RADAR_LABEL_PADDING &&
    rect.top + rect.height <= size - RADAR_LABEL_PADDING
  );
}

function getLabelPlacement(
  pointX: number,
  pointY: number,
  occupied: Rect[],
): LabelPlacement {
  const candidates = [
    {
      left: pointX - RADAR_LABEL_WIDTH / 2,
      top: pointY - RADAR_LABEL_HEIGHT - 14,
      width: RADAR_LABEL_WIDTH,
      height: RADAR_LABEL_HEIGHT,
    },
    {
      left: pointX + 14,
      top: pointY - RADAR_LABEL_HEIGHT / 2,
      width: RADAR_LABEL_WIDTH,
      height: RADAR_LABEL_HEIGHT,
    },
    {
      left: pointX - RADAR_LABEL_WIDTH - 14,
      top: pointY - RADAR_LABEL_HEIGHT / 2,
      width: RADAR_LABEL_WIDTH,
      height: RADAR_LABEL_HEIGHT,
    },
    {
      left: pointX - RADAR_LABEL_WIDTH / 2,
      top: pointY + 14,
      width: RADAR_LABEL_WIDTH,
      height: RADAR_LABEL_HEIGHT,
    },
    {
      left: pointX + 12,
      top: pointY - RADAR_LABEL_HEIGHT - 12,
      width: RADAR_LABEL_WIDTH,
      height: RADAR_LABEL_HEIGHT,
    },
    {
      left: pointX - RADAR_LABEL_WIDTH - 12,
      top: pointY - RADAR_LABEL_HEIGHT - 12,
      width: RADAR_LABEL_WIDTH,
      height: RADAR_LABEL_HEIGHT,
    },
  ];

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!isWithinRadar(candidate, RADAR_LAYOUT_SIZE)) {
      continue;
    }
    const score = overlapCount(candidate, occupied);
    if (score === 0) {
      occupied.push(candidate);
      return candidate;
    }
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  const maxLeft = RADAR_LAYOUT_SIZE - RADAR_LABEL_WIDTH - RADAR_LABEL_PADDING;
  const maxTop = RADAR_LAYOUT_SIZE - RADAR_LABEL_HEIGHT - RADAR_LABEL_PADDING;
  const clamped: Rect = {
    left: Math.min(Math.max(best.left, RADAR_LABEL_PADDING), maxLeft),
    top: Math.min(Math.max(best.top, RADAR_LABEL_PADDING), maxTop),
    width: RADAR_LABEL_WIDTH,
    height: RADAR_LABEL_HEIGHT,
  };
  occupied.push(clamped);
  return clamped;
}

function getHeadingDegrees(event: DeviceOrientationEventWithCompass) {
  if (
    typeof event.webkitCompassHeading === "number" &&
    Number.isFinite(event.webkitCompassHeading)
  ) {
    return (event.webkitCompassHeading + 360) % 360;
  }

  if (typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
    return (360 - event.alpha + 360) % 360;
  }

  return null;
}

function normalizeHeading(heading: number) {
  return ((heading % 360) + 360) % 360;
}

function shortestHeadingDelta(fromDeg: number, toDeg: number) {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

function getTouchDistance(
  touches: ArrayLike<{ clientX: number; clientY: number }>,
) {
  if (touches.length < 2) {
    return 0;
  }

  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function RadarBrowse({
  title,
  description,
  items,
  hasUserLocation,
  allowedTypes,
  autoFullscreenOnMount = false,
}: RadarBrowseProps) {
  const radarFrameRef = useRef<HTMLDivElement | null>(null);
  const radarRotationRef = useRef<HTMLDivElement | null>(null);
  const headingFrameRef = useRef<number | null>(null);
  const headingLockedRef = useRef(false);
  const pendingHeadingRef = useRef<number | null>(null);
  const renderedHeadingRef = useRef(0);
  const headingValueRef = useRef(0);
  const headingLabelRef = useRef(0);
  const headingLabelUpdateAtRef = useRef(0);
  const compassErrorRef = useRef<string | null>(null);
  const attemptedAutoFullscreenRef = useRef(false);
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(
    null,
  );
  const [headingDeg, setHeadingDeg] = useState(0);
  const [headingLocked, setHeadingLocked] = useState(false);
  const [canTrackHeading, setCanTrackHeading] = useState(false);
  const [needsCompassPermission, setNeedsCompassPermission] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);

  useEffect(() => {
    headingLockedRef.current = headingLocked;
  }, [headingLocked]);

  useEffect(() => {
    compassErrorRef.current = compassError;
  }, [compassError]);

  const flushHeadingFrame = useCallback(() => {
    headingFrameRef.current = null;

    const nextHeading = pendingHeadingRef.current;
    if (nextHeading == null) {
      return;
    }

    const normalizedHeading = normalizeHeading(nextHeading);
    const delta = shortestHeadingDelta(
      renderedHeadingRef.current,
      normalizedHeading,
    );

    if (Math.abs(delta) < HEADING_MIN_STEP_DEG) {
      return;
    }

    renderedHeadingRef.current = normalizedHeading;
    headingValueRef.current = normalizedHeading;

    if (radarRotationRef.current) {
      radarRotationRef.current.style.transform = `rotate(${-normalizedHeading}deg)`;
    }

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (
      Math.abs(
        shortestHeadingDelta(headingLabelRef.current, normalizedHeading),
      ) >= HEADING_LABEL_STEP_DEG &&
      now - headingLabelUpdateAtRef.current >= HEADING_LABEL_UPDATE_INTERVAL_MS
    ) {
      headingLabelRef.current = normalizedHeading;
      headingLabelUpdateAtRef.current = now;
      setHeadingDeg(Math.round(normalizedHeading));
    }
  }, []);

  const applyHeading = useCallback(
    (heading: number) => {
      pendingHeadingRef.current = normalizeHeading(heading);

      if (headingFrameRef.current == null && typeof window !== "undefined") {
        headingFrameRef.current =
          window.requestAnimationFrame(flushHeadingFrame);
      }
    },
    [flushHeadingFrame],
  );

  const listenToOrientation = useCallback(() => {
    const orientationEventName =
      "ondeviceorientationabsolute" in window
        ? "deviceorientationabsolute"
        : "deviceorientation";

    const handleOrientation = (event: Event) => {
      if (headingLockedRef.current) {
        return;
      }
      const heading = getHeadingDegrees(
        event as DeviceOrientationEventWithCompass,
      );
      if (heading == null) {
        return;
      }

      applyHeading(heading);

      if (compassErrorRef.current !== null) {
        compassErrorRef.current = null;
        setCompassError(null);
      }
    };

    window.addEventListener(orientationEventName, handleOrientation, {
      passive: true,
    });

    return () => {
      window.removeEventListener(orientationEventName, handleOrientation);
    };
  }, [applyHeading]);

  useEffect(() => {
    if (radarRotationRef.current) {
      radarRotationRef.current.style.transform = `rotate(${-renderedHeadingRef.current}deg)`;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (headingFrameRef.current != null && typeof window !== "undefined") {
        window.cancelAnimationFrame(headingFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("DeviceOrientationEvent" in window)) {
      setCompassError("Compass not supported on this device/browser.");
      return;
    }

    const OrientationCtor =
      window.DeviceOrientationEvent as DeviceOrientationCtor;

    if (typeof OrientationCtor.requestPermission === "function") {
      setNeedsCompassPermission(true);
      setCanTrackHeading(false);
    } else {
      setNeedsCompassPermission(false);
      setCanTrackHeading(true);
    }
  }, []);

  useEffect(() => {
    if (!canTrackHeading || typeof window === "undefined") {
      return;
    }

    const detach = listenToOrientation();
    return detach;
  }, [canTrackHeading, listenToOrientation]);

  const requestCompassPermission = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const OrientationCtor =
        window.DeviceOrientationEvent as DeviceOrientationCtor;

      if (typeof OrientationCtor.requestPermission !== "function") {
        setNeedsCompassPermission(false);
        setCanTrackHeading(true);
        return;
      }

      const result = await OrientationCtor.requestPermission();
      if (result === "granted") {
        setNeedsCompassPermission(false);
        setCanTrackHeading(true);
        setCompassError(null);
      } else {
        setCompassError("Compass access was denied.");
      }
    } catch {
      setCompassError("Unable to enable compass sensors.");
    }
  }, []);

  const allowedTypesKey = allowedTypes?.join("|") ?? "";

  const scopedItems = useMemo(() => {
    if (!allowedTypesKey) {
      return items;
    }

    const allowed = new Set(allowedTypesKey.split("|"));
    return items.filter((item) => allowed.has(item.type));
  }, [allowedTypesKey, items]);

  const sorted = useMemo(
    () => [...scopedItems].sort((a, b) => a.distanceKm - b.distanceKm),
    [scopedItems],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const syncFullscreenState = () => {
      const active = document.fullscreenElement === radarFrameRef.current;
      setIsNativeFullscreen(active);
      if (active) {
        setIsPseudoFullscreen(false);
      }
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    if (!isPseudoFullscreen || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPseudoFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isPseudoFullscreen]);

  const isFullscreenActive = isNativeFullscreen || isPseudoFullscreen;

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement === radarFrameRef.current) {
        await document.exitFullscreen();
        return;
      }

      if (
        radarFrameRef.current &&
        typeof radarFrameRef.current.requestFullscreen === "function"
      ) {
        await radarFrameRef.current.requestFullscreen();
        return;
      }

      setIsPseudoFullscreen((prev) => !prev);
    } catch {
      setIsPseudoFullscreen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    if (
      !autoFullscreenOnMount ||
      attemptedAutoFullscreenRef.current ||
      isFullscreenActive ||
      typeof window === "undefined"
    ) {
      return;
    }

    if (!window.matchMedia("(max-width: 1023px)").matches) {
      return;
    }

    attemptedAutoFullscreenRef.current = true;
    const timer = window.setTimeout(() => {
      void toggleFullscreen();
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoFullscreenOnMount, isFullscreenActive, toggleFullscreen]);

  const autoMaxDistanceKm =
    sorted.length > 0
      ? Math.max(
          4,
          Math.min(120, sorted[Math.min(sorted.length - 1, 24)].distanceKm),
        )
      : 10;
  const sliderMaxDistanceKm = Math.max(80, Math.ceil(autoMaxDistanceKm + 20));
  const [distanceScaleKm, setDistanceScaleKm] = useState(10);

  const clampDistanceScale = useCallback(
    (value: number) =>
      Math.min(Math.max(value, MIN_DISTANCE_KM), sliderMaxDistanceKm),
    [sliderMaxDistanceKm],
  );

  useEffect(() => {
    setDistanceScaleKm((prev) => {
      const safePrev = Number.isFinite(prev)
        ? prev
        : Math.ceil(autoMaxDistanceKm);
      return clampDistanceScale(safePrev);
    });
  }, [autoMaxDistanceKm, clampDistanceScale]);

  const maxDistanceKm = useMemo(
    () => clampDistanceScale(distanceScaleKm),
    [clampDistanceScale, distanceScaleKm],
  );

  const zoomRadarIn = useCallback(() => {
    setDistanceScaleKm((prev) => clampDistanceScale(prev * 0.85));
  }, [clampDistanceScale]);

  const zoomRadarOut = useCallback(() => {
    setDistanceScaleKm((prev) => clampDistanceScale(prev * 1.15));
  }, [clampDistanceScale]);

  const resetRadarZoom = useCallback(() => {
    setDistanceScaleKm(clampDistanceScale(autoMaxDistanceKm));
  }, [autoMaxDistanceKm, clampDistanceScale]);

  const pointLayouts = useMemo(() => {
    const plottedItems = sorted.slice(0, 60);
    const occupiedLabelRects: Rect[] = [];

    return plottedItems.map((item) => {
      const label = itemTypeLabel(item);
      const pointColor = colorFromKey((item.colorKey ?? label).toLowerCase());
      const pos = pointPosition(
        item.distanceKm,
        item.bearingDeg,
        maxDistanceKm,
      );
      const pointX = (pos.x / 100) * RADAR_LAYOUT_SIZE;
      const pointY = (pos.y / 100) * RADAR_LAYOUT_SIZE;
      const labelRect = getLabelPlacement(pointX, pointY, occupiedLabelRects);

      const labelCenterX = labelRect.left + labelRect.width / 2;
      const labelCenterY = labelRect.top + labelRect.height / 2;
      const toPointX = pointX - labelCenterX;
      const toPointY = pointY - labelCenterY;
      const absX = Math.abs(toPointX) || 0.0001;
      const absY = Math.abs(toPointY) || 0.0001;
      const halfW = labelRect.width / 2;
      const halfH = labelRect.height / 2;
      const edgeScale = Math.min(halfW / absX, halfH / absY);
      const anchorX = labelCenterX + toPointX * edgeScale;
      const anchorY = labelCenterY + toPointY * edgeScale;
      const connectorDx = anchorX - pointX;
      const connectorDy = anchorY - pointY;
      const connectorLengthPx = Math.hypot(connectorDx, connectorDy);
      const connectorAngleDeg =
        (Math.atan2(connectorDy, connectorDx) * 180) / Math.PI;
      const pointPercent = {
        left: `${pos.x}%`,
        top: `${pos.y}%`,
      };
      const labelAnchorPercent = {
        left: `${(anchorX / RADAR_LAYOUT_SIZE) * 100}%`,
        top: `${(anchorY / RADAR_LAYOUT_SIZE) * 100}%`,
      };

      return {
        item,
        label,
        pointColor,
        pos,
        pointPercent,
        labelAnchorPercent,
        connectorStyle:
          connectorLengthPx > 4
            ? {
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${(connectorLengthPx / RADAR_LAYOUT_SIZE) * 100}%`,
                transform: `translateY(-50%) rotate(${connectorAngleDeg}deg)`,
              }
            : null,
        labelStyle: {
          left: `${((labelRect.left + labelRect.width / 2) / RADAR_LAYOUT_SIZE) * 100}%`,
          top: `${((labelRect.top + labelRect.height / 2) / RADAR_LAYOUT_SIZE) * 100}%`,
          width: `${labelRect.width}px`,
        },
      };
    });
  }, [maxDistanceKm, sorted]);

  const legend = useMemo(
    () =>
      Array.from(
        new Map(
          sorted.map((item) => {
            const label = itemTypeLabel(item);
            const key = (item.colorKey ?? label).toLowerCase();
            return [label, colorFromKey(key)] as const;
          }),
        ).entries(),
      ).slice(0, 10),
    [sorted],
  );

  if (!hasUserLocation) {
    return (
      <section className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-linear-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          Radar mode
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Enable location to visualize nearby results on a directional radar
          with true distance and bearing.
        </p>
      </section>
    );
  }

  if (scopedItems.length === 0) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          Radar mode
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          No location-ready results match current filters.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_48px_-28px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 bg-linear-to-r from-slate-950 via-slate-900 to-emerald-950 px-5 py-4 text-white sm:px-6">
        <h3 className="text-lg font-semibold sm:text-xl">{title}</h3>
        <p className="mt-1 text-xs text-emerald-100/90 sm:text-sm">
          {description}
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(340px,1.1fr)_minmax(0,0.9fr)]">
        <div
          className={
            isFullscreenActive
              ? "fixed inset-0 z-[90] bg-slate-950/95 p-3 sm:p-5"
              : "p-4 sm:p-6"
          }
        >
          <div
            className={
              isFullscreenActive
                ? "flex h-full w-full items-center justify-center"
                : ""
            }
          >
            <div
              ref={radarFrameRef}
              className={`relative aspect-square w-full overflow-hidden border border-emerald-300/40 bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#052e2b_58%,_#031716_100%)] ${
                isFullscreenActive
                  ? "max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] rounded-[1.25rem]"
                  : "mx-auto max-w-none rounded-[2rem] lg:max-w-[640px]"
              }`}
              onWheel={(event) => {
                if (!(event.ctrlKey || event.metaKey)) {
                  return;
                }
                event.preventDefault();
                setDistanceScaleKm((prev) =>
                  clampDistanceScale(prev * (event.deltaY > 0 ? 1.1 : 0.9)),
                );
              }}
              onTouchStart={(event) => {
                if (event.touches.length !== 2) {
                  return;
                }
                pinchStartRef.current = {
                  distance: getTouchDistance(event.touches),
                  scale: maxDistanceKm,
                };
              }}
              onTouchMove={(event) => {
                if (event.touches.length !== 2 || !pinchStartRef.current) {
                  return;
                }

                event.preventDefault();
                const currentDistance = getTouchDistance(event.touches);
                if (currentDistance <= 0) {
                  return;
                }

                const ratio = pinchStartRef.current.distance / currentDistance;
                setDistanceScaleKm(
                  clampDistanceScale(pinchStartRef.current.scale * ratio),
                );
              }}
              onTouchEnd={() => {
                pinchStartRef.current = null;
              }}
              onTouchCancel={() => {
                pinchStartRef.current = null;
              }}
            >
              <div className="absolute right-3 top-3 z-[65] flex flex-wrap justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setHeadingLocked((prev) => !prev)}
                  className={`inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                    headingLocked
                      ? "border-amber-300/70 bg-amber-500/20 text-amber-100"
                      : "border-emerald-200/35 bg-slate-900/75 text-emerald-50 hover:bg-slate-900/90"
                  }`}
                >
                  {headingLocked ? "Heading locked" : "Live heading"}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200/35 bg-slate-900/75 px-2.5 text-[11px] font-semibold text-emerald-50 transition-colors hover:bg-slate-900/90"
                >
                  {isFullscreenActive ? "Exit full screen" : "Full screen"}
                </button>
              </div>

              <div
                ref={radarRotationRef}
                className="absolute inset-0 will-change-transform"
              >
                <div className="absolute inset-[9%] rounded-full border border-emerald-200/25" />
                <div className="absolute inset-[22%] rounded-full border border-emerald-200/25" />
                <div className="absolute inset-[35%] rounded-full border border-emerald-200/25" />
                <div className="absolute inset-[48%] rounded-full border border-emerald-200/25" />
                <div className="absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-emerald-200/20" />
                <div className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 bg-emerald-200/20" />

                <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(16,185,129,0)_0deg,rgba(16,185,129,0.3)_44deg,rgba(16,185,129,0)_88deg)]" />

                <div className="absolute left-1/2 top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.9)]" />

                {pointLayouts.map(
                  ({
                    item,
                    label,
                    pointColor,
                    pos,
                    pointPercent,
                    labelAnchorPercent,
                    labelStyle,
                    connectorStyle,
                  }) => {
                    return (
                      <Fragment key={item.id}>
                        {connectorStyle ? (
                          <span
                            className="pointer-events-none absolute z-[31] h-px origin-left rounded-full bg-white/45 shadow-[0_0_10px_rgba(255,255,255,0.25)]"
                            style={connectorStyle}
                          />
                        ) : null}
                        {connectorStyle ? (
                          <span
                            className="pointer-events-none absolute z-[32] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-slate-900 shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                            style={labelAnchorPercent}
                          />
                        ) : null}
                        {connectorStyle ? (
                          <span
                            className="pointer-events-none absolute z-[32] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.45)]"
                            style={pointPercent}
                          />
                        ) : null}
                        <Link
                          href={item.href}
                          className="group absolute z-30"
                          style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                          aria-label={`${item.name}, ${label}, ${formatDistance(item.distanceKm)}, ${bearingToCompass(item.bearingDeg)}`}
                        >
                          <span
                            className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/30 bg-slate-900/80 px-2 py-1 text-center text-[10px] leading-tight text-emerald-50 shadow-[0_8px_22px_-14px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-all duration-200 group-hover:-translate-y-[53%] group-hover:bg-slate-900/95"
                            style={labelStyle}
                          >
                            <span className="block max-w-[160px] truncate font-semibold text-white">
                              {item.name}
                            </span>
                            <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-emerald-100/95">
                              {label} • {formatDistance(item.distanceKm)} •{" "}
                              {bearingToCompass(item.bearingDeg)}
                            </span>
                            {item.subtitle ? (
                              <span className="mt-0.5 block max-w-[160px] truncate text-[9px] text-emerald-200/90">
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                          <span
                            className="block h-3.5 w-3.5 rounded-full border border-white/70 shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-transform duration-200 group-hover:scale-125"
                            style={{ backgroundColor: pointColor }}
                          />
                        </Link>
                      </Fragment>
                    );
                  },
                )}

                <div className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
                  N
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
                  S
                </div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
                  W
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-widest text-emerald-100/90">
                  E
                </div>
              </div>

              <div className="absolute bottom-3 left-3 right-3 z-50 rounded-xl border border-emerald-200/25 bg-slate-900/80 px-3 py-2 text-emerald-50 backdrop-blur-sm">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-semibold uppercase tracking-[0.16em] text-emerald-100/90">
                    Radar range
                  </span>
                  <span>Scale: {formatDistance(maxDistanceKm)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={zoomRadarIn}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-emerald-200/30 bg-slate-900/70 px-2 text-xs font-bold text-emerald-50 transition-colors hover:bg-slate-900"
                    aria-label="Zoom in radar"
                  >
                    +
                  </button>
                  <input
                    type="range"
                    min={MIN_DISTANCE_KM}
                    max={sliderMaxDistanceKm}
                    step={0.5}
                    value={maxDistanceKm}
                    onChange={(event) =>
                      setDistanceScaleKm(Number(event.target.value))
                    }
                    className="h-1.5 w-full cursor-pointer accent-emerald-400"
                    aria-label="Radar distance scale"
                  />
                  <button
                    type="button"
                    onClick={zoomRadarOut}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-emerald-200/30 bg-slate-900/70 px-2 text-xs font-bold text-emerald-50 transition-colors hover:bg-slate-900"
                    aria-label="Zoom out radar"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={resetRadarZoom}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-200/30 bg-slate-900/70 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-50 transition-colors hover:bg-slate-900"
                  >
                    Auto
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-emerald-100/85">
                  Pinch or use Ctrl/Cmd + scroll to zoom. Smaller km = closer
                  zoom.
                </p>
              </div>

              {needsCompassPermission ? (
                <div className="absolute inset-x-4 top-4 z-[60] rounded-xl border border-emerald-200/35 bg-slate-950/80 p-3 text-emerald-50 backdrop-blur-sm">
                  <p className="text-xs leading-relaxed text-emerald-100/95">
                    Enable compass sensors to align this radar with your device
                    orientation.
                  </p>
                  <button
                    type="button"
                    onClick={() => void requestCompassPermission()}
                    className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-400"
                  >
                    Enable compass
                  </button>
                </div>
              ) : null}

              {compassError ? (
                <div className="absolute left-4 top-4 z-[55] rounded-lg border border-amber-200/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] text-amber-100 backdrop-blur-sm">
                  {compassError}
                </div>
              ) : null}

              <div className="pointer-events-none absolute left-1/2 top-1/2 z-[45] -translate-x-1/2 translate-y-8 rounded-full border border-emerald-200/30 bg-slate-900/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100 shadow-[0_8px_18px_-12px_rgba(0,0,0,0.9)] backdrop-blur-sm">
                {formatDistance(maxDistanceKm)} range
              </div>

              <div className="absolute bottom-3 right-3 rounded-lg border border-emerald-200/25 bg-slate-900/70 px-2.5 py-1 text-xs text-emerald-50">
                {headingLocked ? "Locked" : "Heading"}: {Math.round(headingDeg)}
                °
              </div>
            </div>
          </div>
        </div>

        <aside className="max-h-[420px] overflow-y-auto border-t border-slate-100 bg-slate-50/75 p-4 lg:max-h-[680px] lg:border-l lg:border-t-0 lg:p-5">
          {legend.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {legend.map(([label, color]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span>Nearest</span>
          </div>
          <div className="space-y-2.5">
            {sorted.slice(0, 30).map((item) => {
              const label = itemTypeLabel(item);
              const pointColor = colorFromKey(
                (item.colorKey ?? label).toLowerCase(),
              );

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/45"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      {item.subtitle ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: pointColor }}
                      />
                      {label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-emerald-700">
                      {formatDistance(item.distanceKm)}
                    </span>
                    <span>•</span>
                    <span>
                      {Math.round(item.bearingDeg)}°{" "}
                      {bearingToCompass(item.bearingDeg)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

RadarBrowse.displayName = "RadarBrowse";

export default memo(RadarBrowse);
