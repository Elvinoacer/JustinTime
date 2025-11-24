"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInitiateSubscription, useSubscriptionStatus } from "@/lib/api/hooks/useSubscription";

const PremiumPage = () => {
  const router = useRouter();
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useSubscriptionStatus();
  const initiateSubscription = useInitiateSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"PRO" | "BUSINESS" | null>(null);

  const currentPlan = subscriptionData?.subscription?.plan || "FREE";

  const handleUpgrade = (plan: "PRO" | "BUSINESS") => {
    setSelectedPlan(plan);
    initiateSubscription.mutate({ plan });
  };

  const pricingTiers = [
    {
      name: "FREE",
      price: 0,
      description: "Perfect for getting started",
      features: [
        "Basic profile",
        "Up to 5 service listings",
        "Standard support",
        "Basic analytics",
        "Limited job applications",
      ],
      color: "gray",
      recommended: false,
      ctaText: currentPlan === "FREE" ? "Current Plan" : "Downgrade",
      disabled: true,
    },
    {
      name: "PRO",
      price: 2999,
      description: "For growing professionals",
      features: [
        "Everything in FREE",
        "Unlimited service listings",
        "Priority support",
        "Advanced analytics",
        "Unlimited job applications",
        "Featured profile badge",
        "Priority in search results",
        "Monthly performance reports",
      ],
      color: "emerald",
      recommended: true,
      ctaText: currentPlan === "PRO" ? "Current Plan" : "Upgrade to PRO",
      disabled: currentPlan === "PRO" || currentPlan === "BUSINESS",
    },
    {
      name: "BUSINESS",
      price: 9999,
      description: "For established businesses (Coming Soon)",
      features: [
        "Everything in PRO",
        "Team accounts (up to 5)",
        "Dedicated account manager",
        "Custom branding",
        "API access",
        "White-label option",
        "Advanced integrations",
        "Custom contracts",
        "24/7 premium support",
      ],
      color: "amber",
      recommended: false,
      ctaText: "Coming Soon",
      disabled: true, // Disabled - not available yet
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
        >
          Choose Your Plan
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-600 max-w-2xl mx-auto"
        >
          Unlock premium features and grow your business with our flexible pricing plans
        </motion.p>
      </div>

      {/* Current Plan Badge */}
      {subscriptionData?.subscription && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600">
                workspace_premium
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Current Plan: {currentPlan}</p>
              {subscriptionData.subscription.daysRemaining && (
                <p className="text-sm text-gray-600">
                  {subscriptionData.subscription.daysRemaining} days remaining
                </p>
              )}
            </div>
          </div>
          {subscriptionData.subscription.isPremium && (
            <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">verified</span>
              Premium Active
            </span>
          )}
        </motion.div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {pricingTiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-white rounded-2xl shadow-lg border-2 ${
              tier.recommended
                ? "border-emerald-500 ring-4 ring-emerald-100"
                : "border-gray-200"
            } p-8 flex flex-col`}
          >
            {/* Recommended Badge */}
            {tier.recommended && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan Name */}
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
              <p className="text-gray-600 text-sm">{tier.description}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  KES {tier.price.toLocaleString()}
                </span>
                <span className="text-gray-600">/month</span>
              </div>
            </div>

            {/* Features */}
            <div className="mb-8 flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <span
                      className={`material-symbols-outlined text-sm mt-0.5 ${
                        tier.color === "emerald"
                          ? "text-emerald-600"
                          : tier.color === "amber"
                          ? "text-amber-600"
                          : "text-gray-400"
                      }`}
                    >
                      check_circle
                    </span>
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => !tier.disabled && tier.name !== "FREE" && handleUpgrade(tier.name as "PRO" | "BUSINESS")}
              disabled={tier.disabled || initiateSubscription.isPending}
              className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                tier.recommended
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  : tier.color === "amber"
                  ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  : "bg-gray-100 text-gray-600 cursor-not-allowed"
              }`}
            >
              {initiateSubscription.isPending && selectedPlan === tier.name ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {tier.ctaText}
                  {!tier.disabled && tier.name !== "FREE" && (
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  )}
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                <th className="text-center py-4 px-4 font-semibold text-gray-900">FREE</th>
                <th className="text-center py-4 px-4 font-semibold text-emerald-600">PRO</th>
                <th className="text-center py-4 px-4 font-semibold text-amber-600">BUSINESS</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "Service Listings", free: "5", pro: "Unlimited", business: "Unlimited" },
                { feature: "Job Applications", free: "Limited", pro: "Unlimited", business: "Unlimited" },
                { feature: "Analytics", free: "Basic", pro: "Advanced", business: "Advanced" },
                { feature: "Support", free: "Standard", pro: "Priority", business: "24/7 Premium" },
                { feature: "Profile Badge", free: false, pro: true, business: true },
                { feature: "Search Priority", free: false, pro: true, business: true },
                { feature: "Team Accounts", free: false, pro: false, business: "Up to 5" },
                { feature: "API Access", free: false, pro: false, business: true },
                { feature: "Custom Branding", free: false, pro: false, business: true },
              ].map((row, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">{row.feature}</td>
                  <td className="py-4 px-4 text-center">
                    {typeof row.free === "boolean" ? (
                      row.free ? (
                        <span className="material-symbols-outlined text-gray-400">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-gray-300">close</span>
                      )
                    ) : (
                      <span className="text-gray-700">{row.free}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <span className="material-symbols-outlined text-emerald-600">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-gray-300">close</span>
                      )
                    ) : (
                      <span className="text-gray-700">{row.pro}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {typeof row.business === "boolean" ? (
                      row.business ? (
                        <span className="material-symbols-outlined text-amber-600">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-gray-300">close</span>
                      )
                    ) : (
                      <span className="text-gray-700">{row.business}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              question: "Can I change my plan anytime?",
              answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
            },
            {
              question: "What payment methods do you accept?",
              answer: "We accept M-Pesa, credit/debit cards, and bank transfers via IntaSend.",
            },
            {
              question: "Is there a refund policy?",
              answer: "We offer a 7-day money-back guarantee if you're not satisfied with your subscription.",
            },
            {
              question: "Do subscriptions auto-renew?",
              answer: "Yes, subscriptions auto-renew monthly unless you cancel before the renewal date.",
            },
          ].map((faq, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600 text-sm">{faq.answer}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumPage;
