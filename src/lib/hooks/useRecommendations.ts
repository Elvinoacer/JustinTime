import { useState, useEffect } from "react";

interface Job {
  id: string;
  title: string;
  description: string;
  category?: {
    name: string;
  };
  [key: string]: any;
}

interface UserProfile {
  interests: string[];
  skills?: string[];
  bio?: string;
}

/**
 * Keyword-Based Job Recommendation System
 * Uses TF-IDF style scoring with keyword matching for personalized job recommendations
 */
export const useRecommendations = (jobs: Job[], userProfile: UserProfile) => {
  const [recommendations, setRecommendations] = useState<Job[]>([]);
  const [recommendationScores, setRecommendationScores] = useState<Record<string, number>>({});
  const [isModelLoading, setIsModelLoading] = useState(false);

  useEffect(() => {
    const calculateRecommendations = () => {
      // Don't run if no jobs or empty profile
      if (jobs.length === 0 || (!userProfile.interests.length && !userProfile.skills?.length && !userProfile.bio)) {
        setRecommendations(prev => prev.length === 0 ? prev : []);
        setRecommendationScores(prev => Object.keys(prev).length === 0 ? prev : {});
        return;
      }

      setIsModelLoading(true);

      try {
        // Combine user profile into keywords
        const userKeywords = [
          ...userProfile.interests,
          ...(userProfile.skills || []),
          ...(userProfile.bio ? tokenize(userProfile.bio) : [])
        ].map(k => k.toLowerCase().trim()).filter(Boolean);

        if (userKeywords.length === 0) {
          setRecommendations(prev => prev.length === 0 ? prev : []);
          setRecommendationScores(prev => Object.keys(prev).length === 0 ? prev : {});
          setIsModelLoading(false);
          return;
        }

        // Calculate scores for each job
        const scoredJobs = jobs.map(job => {
          // Extract job keywords
          const jobText = `${job.title} ${job.description} ${job.category?.name || ""}`.toLowerCase();
          const jobKeywords = tokenize(jobText);

          // Calculate similarity score using multiple factors
          const score = calculateJobScore(userKeywords, jobKeywords, job);

          return {
            ...job,
            score
          };
        });

        // Sort by score descending
        scoredJobs.sort((a, b) => b.score - a.score);

        // Create scores map
        const scores: Record<string, number> = {};
        scoredJobs.forEach(job => {
          scores[job.id] = job.score;
        });

        setRecommendationScores(prev => {
          if (JSON.stringify(prev) === JSON.stringify(scores)) return prev;
          return scores;
        });
        setRecommendations(prev => {
          if (JSON.stringify(prev) === JSON.stringify(scoredJobs)) return prev;
          return scoredJobs;
        });
      } catch (error) {
        console.error("Error calculating recommendations:", error);
      } finally {
        setIsModelLoading(false);
      }
    };

    calculateRecommendations();
  }, [jobs, JSON.stringify(userProfile.interests), JSON.stringify(userProfile.skills), userProfile.bio]);

  return {
    recommendations,
    recommendationScores,
    isModelLoading
  };
};

/**
 * Tokenize text into keywords (simple word extraction)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2) // Filter out very short words
    .filter(word => !isStopWord(word)); // Remove common stop words
}

/**
 * Simple stop words list (common words to ignore)
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    "the", "and", "for", "with", "you", "that", "this", "from", "have",
    "are", "was", "were", "been", "has", "had", "will", "can", "our",
    "all", "but", "not", "what", "when", "where", "who", "how", "why"
  ]);
  return stopWords.has(word);
}

/**
 * Calculate job relevance score using multiple factors
 */
function calculateJobScore(userKeywords: string[], jobKeywords: string[], job: Job): number {
  let score = 0;

  // 1. Keyword overlap (TF-IDF style)
  const commonKeywords = userKeywords.filter(uk => 
    jobKeywords.some(jk => jk.includes(uk) || uk.includes(jk))
  );
  
  // Base score from keyword matches
  score += commonKeywords.length * 10;

  // 2. Title match bonus (title keywords are more important)
  const titleKeywords = tokenize(job.title.toLowerCase());
  const titleMatches = userKeywords.filter(uk =>
    titleKeywords.some(tk => tk.includes(uk) || uk.includes(tk))
  );
  score += titleMatches.length * 15;

  // 3. Category exact match bonus
  if (job.category?.name) {
    const categoryName = job.category.name.toLowerCase();
    const categoryMatches = userKeywords.some(uk => 
      categoryName.includes(uk) || uk.includes(categoryName)
    );
    if (categoryMatches) {
      score += 20;
    }
  }

  // 4. Jaccard similarity for overall text overlap
  const intersection = new Set(userKeywords.filter(uk => jobKeywords.includes(uk)));
  const union = new Set([...userKeywords, ...jobKeywords]);
  const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;
  score += jaccardSimilarity * 30;

  // 5. Normalize score to 0-1 range
  const normalizedScore = Math.min(score / 100, 1);

  return normalizedScore;
}
