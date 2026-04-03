export const PAYMENT_AMOUNTS = {
  ONBOARDING_FEE: 500,
  MIN_TOPUP: 10,
} as const;

export const SUBSCRIPTION_PRICES = {
  PRO: 2999,
  BUSINESS: 9999,
} as const;

export type SubscriptionPaidPlan = keyof typeof SUBSCRIPTION_PRICES;

export const LEADS_PACKAGES = [
  {
    id: "starter",
    credits: 5,
    price: 450,
    discount: "10%",
    label: "Starter",
    popular: false,
  },
  {
    id: "growth",
    credits: 20,
    price: 1600,
    discount: "20%",
    label: "Growth",
    popular: true,
  },
  {
    id: "pro",
    credits: 50,
    price: 3500,
    discount: "30%",
    label: "Professional",
    popular: false,
  },
] as const;

export type LeadsPackageId = (typeof LEADS_PACKAGES)[number]["id"];

export const PROMOTION_PLANS = {
  STANDARD: {
    days: 7,
    price: 1000,
    label: "Standard Boost",
    popular: false,
    features: [
      "Top of search results",
      "Highlighted listing",
      "7 Days Duration",
    ],
  },
  PREMIUM: {
    days: 30,
    price: 3000,
    label: "Premium Power",
    popular: true,
    features: [
      "Top of search results",
      "Premium Badge",
      "30 Days Duration",
      "Priority Support",
    ],
  },
} as const;

export type PromotionPlan = keyof typeof PROMOTION_PLANS;
