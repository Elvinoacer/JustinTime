import { BadgeCategory } from "@/generated/prisma/client";

export interface BadgeRequirement {
  type:
    | "JOB_COUNT"
    | "AVG_COMPLETION_TIME"
    | "RATING_THRESHOLD"
    | "PROFILE_COMPLETENESS"
    | "REVENUE_MILESTONE"
    | "JOINED_BEFORE_DATE"
    | "MANUAL_ONLY";
  value?: number;
  date?: string;
  rating?: number;
  minReviews?: number;
}

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  color: string;
  requirement: BadgeRequirement;
  points: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // MILESTONE BADGES
  {
    slug: "first-job",
    name: "Getting Started",
    description: "Completed your first job",
    category: "MILESTONE",
    icon: "🎯",
    color: "#10b981",
    requirement: { type: "JOB_COUNT", value: 1 },
    points: 10,
  },
  {
    slug: "10-jobs",
    name: "Rising Star",
    description: "Completed 10 jobs successfully",
    category: "MILESTONE",
    icon: "⭐",
    color: "#fbbf24",
    requirement: { type: "JOB_COUNT", value: 10 },
    points: 50,
  },
  {
    slug: "50-jobs",
    name: "Professional",
    description: "Completed 50 jobs",
    category: "MILESTONE",
    icon: "💼",
    color: "#3b82f6",
    requirement: { type: "JOB_COUNT", value: 50 },
    points: 250,
  },
  {
    slug: "100-jobs",
    name: "Century Club",
    description: "Completed 100 jobs - Elite status!",
    category: "MILESTONE",
    icon: "💯",
    color: "#8b5cf6",
    requirement: { type: "JOB_COUNT", value: 100 },
    points: 500,
  },
  {
    slug: "500-jobs",
    name: "Legend",
    description: "Completed 500 jobs - A true legend!",
    category: "MILESTONE",
    icon: "👑",
    color: "#f59e0b",
    requirement: { type: "JOB_COUNT", value: 500 },
    points: 2500,
  },

  // PERFORMANCE BADGES
  {
    slug: "super-fast",
    name: "Super Fast",
    description: "Average completion time under 2 hours",
    category: "PERFORMANCE",
    icon: "⚡",
    color: "#eab308",
    requirement: { type: "AVG_COMPLETION_TIME", value: 120 },
    points: 100,
  },
  {
    slug: "5-star-pro",
    name: "5-Star Pro",
    description: "Maintain 5.0 rating with 20+ reviews",
    category: "PERFORMANCE",
    icon: "🌟",
    color: "#facc15",
    requirement: { type: "RATING_THRESHOLD", rating: 5.0, minReviews: 20 },
    points: 200,
  },
  {
    slug: "highly-rated",
    name: "Highly Rated",
    description: "Maintain 4.5+ rating with 50+ reviews",
    category: "PERFORMANCE",
    icon: "⭐️",
    color: "#fb923c",
    requirement: { type: "RATING_THRESHOLD", rating: 4.5, minReviews: 50 },
    points: 300,
  },

  // ENGAGEMENT BADGES
  {
    slug: "profile-master",
    name: "Profile Master",
    description: "Complete 100% of your profile",
    category: "ENGAGEMENT",
    icon: "✨",
    color: "#06b6d4",
    requirement: { type: "PROFILE_COMPLETENESS", value: 100 },
    points: 50,
  },

  // SPECIAL BADGES
  {
    slug: "early-adopter",
    name: "Early Adopter",
    description: "Joined during the launch phase",
    category: "SPECIAL",
    icon: "🚀",
    color: "#ec4899",
    requirement: {
      type: "JOINED_BEFORE_DATE",
      date: "2026-01-31T23:59:59.000Z",
    },
    points: 100,
  },
];
