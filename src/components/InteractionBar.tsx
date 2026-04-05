"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

interface InteractionBarProps {
  id: string;
  type: "professional" | "service";
  initialViews: number;
  initialFavorites: number;
}

const InteractionBar = ({
  id,
  type,
  initialViews,
  initialFavorites,
}: InteractionBarProps) => {
  const [views, setViews] = useState(initialViews);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [isFavorited, setIsFavorited] = useState(false);

  const readStorage = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage write failures (private mode, blocked storage, etc.).
    }
  };

  const removeStorage = (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage remove failures.
    }
  };

  const readInteractionCounts = (
    response: unknown,
  ): { views: number; favorites: number } | null => {
    const payload = response as {
      data?: {
        data?: {
          views?: unknown;
          favorites?: unknown;
        };
      };
    };

    const rawViews = payload?.data?.data?.views;
    const rawFavorites = payload?.data?.data?.favorites;

    if (typeof rawViews !== "number" || typeof rawFavorites !== "number") {
      return null;
    }

    return {
      views: rawViews,
      favorites: rawFavorites,
    };
  };

  const getAnonymousInteractionId = () => {
    const storageKey = "jit_anonymous_interaction_id";
    const existing = readStorage(storageKey);
    if (existing) {
      return existing;
    }

    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    writeStorage(storageKey, generated);
    return generated;
  };

  useEffect(() => {
    setViews(initialViews);
  }, [initialViews]);

  useEffect(() => {
    setFavorites(initialFavorites);
  }, [initialFavorites]);

  // Load state from local storage and track view
  useEffect(() => {
    let cancelled = false;
    const storageKeyView = `viewed_${type}_${id}`;
    const storageKeyFavorite = `favorited_${type}_${id}`;

    const alreadyViewed = readStorage(storageKeyView);
    const alreadyFavorited = readStorage(storageKeyFavorite);

    if (alreadyFavorited) {
      setIsFavorited(true);
    }

    if (!alreadyViewed) {
      // Mark immediately to prevent duplicate track calls from multiple mounted bars.
      writeStorage(storageKeyView, "pending");

      // Track view
      const trackView = async () => {
        try {
          const endpoint =
            type === "professional"
              ? `/professionals/${id}/interactions`
              : `/services/${id}/interactions`;

          const response = await apiClient.post(
            endpoint,
            { type: "view" },
            {
              headers: {
                "x-anonymous-id": getAnonymousInteractionId(),
              },
            },
          );

          if (cancelled) {
            return;
          }

          const counts = readInteractionCounts(response);
          if (counts) {
            setViews(counts.views);
            setFavorites(counts.favorites);
          } else {
            setViews((prev) => prev + 1);
          }

          writeStorage(storageKeyView, "true");
        } catch (error) {
          console.error("Failed to track view:", error);
          removeStorage(storageKeyView);
        }
      };

      trackView();
    }

    return () => {
      cancelled = true;
    };
  }, [id, type]);

  const handleFavorite = async () => {
    const storageKeyFavorite = `favorited_${type}_${id}`;

    // Optimistic update
    if (isFavorited) {
      // We don't support "un-favoriting" in this anonymous mode easily without auth,
      // but for UI feedback we can toggle it.
      // However, the requirement implies a "Like" counter.
      // Usually anonymous likes are permanent per session/device.
      // Let's allow toggling off locally, but we won't decrement server side to avoid abuse
      // (or we could, but let's stick to increment only as per typical "like" behavior for ease)
      // Actually, let's just prevent un-liking for now to keep it simple and consistent with "views"
      toast.info("You have already favorited this.");
      return;
    }

    setIsFavorited(true);
    setFavorites((prev) => prev + 1);
    writeStorage(storageKeyFavorite, "true");

    try {
      const endpoint =
        type === "professional"
          ? `/professionals/${id}/interactions`
          : `/services/${id}/interactions`;

      const response = await apiClient.post(
        endpoint,
        { type: "favorite" },
        {
          headers: {
            "x-anonymous-id": getAnonymousInteractionId(),
          },
        },
      );

      const counts = readInteractionCounts(response);
      if (counts) {
        setViews(counts.views);
        setFavorites(counts.favorites);
      }

      toast.success("Added to favorites!");
    } catch (error) {
      console.error("Failed to track favorite:", error);
      // Revert on error
      setIsFavorited(false);
      setFavorites((prev) => prev - 1);
      removeStorage(storageKeyFavorite);
      toast.error("Failed to favorite. Please try again.");
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-100">
      {/* Views */}
      <div
        className="flex items-center gap-1.5 text-gray-500"
        title="Total Views"
      >
        <span className="material-symbols-outlined text-[20px]">
          visibility
        </span>
        <span className="text-sm font-medium">{views.toLocaleString()}</span>
      </div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Favorites */}
      <button
        onClick={handleFavorite}
        className={`flex items-center gap-1.5 transition-colors ${
          isFavorited ? "text-red-500" : "text-gray-500 hover:text-red-500"
        }`}
        title="Add to Favorites"
      >
        <span
          className={`material-symbols-outlined text-[20px] ${isFavorited ? "fill-current" : ""}`}
        >
          favorite
        </span>
        <span className="text-sm font-medium">
          {favorites.toLocaleString()}
        </span>
      </button>
    </div>
  );
};

export default InteractionBar;
