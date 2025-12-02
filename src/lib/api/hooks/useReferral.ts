import { useQuery, UseQueryResult } from "@tanstack/react-query";
import apiClient from "../client";

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalPoints: number;
    redeemableValue: string;
    totalReferrals: number;
    completedReferrals: number;
    pendingRewards: number;
  };
  recentReferrals: Array<{
    name: string;
    date: string;
    points: number;
    status: string;
  }>;
  tiers: Array<{
    referrals: number;
    reward: string;
    completed: boolean;
  }>;
}

async function fetchReferralData(): Promise<ReferralData> {
  const { data } = await apiClient.get("/client/referral");
  return data.data;
}

export function useReferralData(): UseQueryResult<ReferralData, Error> {
  return useQuery({
    queryKey: ["referral-data"],
    queryFn: fetchReferralData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
