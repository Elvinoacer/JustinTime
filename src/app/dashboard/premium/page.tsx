"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useInitiateSubscription,
  useSubscriptionStatus,
} from "@/lib/api/hooks/useSubscription";
import { StkPhonePromptModal } from "@/components/payments/StkPhonePromptModal";
import { useStkPhonePrefill } from "@/hooks/useStkPhonePrefill";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/utils/phone";

const PremiumPage = () => {
  const { data: subscriptionData } = useSubscriptionStatus();
  const initiateSubscription = useInitiateSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"PRO" | "BUSINESS" | null>(
    null,
  );
  const [planForPhonePrompt, setPlanForPhonePrompt] = useState<
    "PRO" | "BUSINESS" | null
  >(null);
  const [isMobile, setIsMobile] = useState(false);
  const {
    phone: stkPhoneNumber,
    setPhone: setStkPhoneNumber,
    isLoadingPhone: isLoadingStkPhone,
  } = useStkPhonePrefill();

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const currentPlan = subscriptionData?.subscription?.plan || "FREE";

  const handleUpgrade = (plan: "PRO" | "BUSINESS") => {
    setPlanForPhonePrompt(plan);
  };

  const handleConfirmUpgrade = () => {
    if (!planForPhonePrompt) {
      return;
    }

    const normalizedPhone = normalizeKenyanPhone(stkPhoneNumber);
    if (!isValidKenyanPhone(normalizedPhone)) {
      toast.error(
        "Enter a valid M-Pesa phone number (e.g. 254712345678).",
      );
      return;
    }

    setStkPhoneNumber(normalizedPhone);

    setSelectedPlan(planForPhonePrompt);
    initiateSubscription.mutate({
      plan: planForPhonePrompt,
      phoneNumber: normalizedPhone,
    });
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
        "14 job applications per week (2/day)",
        "Standard listing position",
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
        "Up to 20 service listings",
        "Priority support",
        "Advanced analytics",
        "Unlimited job applications",
        "Premium amber 'PRO' badge",
        "Priority in all search results",
        "Monthly performance reports",
        "Increased visibility",
      ],
      color: "emerald",
      recommended: true,
      ctaText: currentPlan === "PRO" ? "Current Plan" : "Upgrade to PRO",
      disabled: currentPlan === "PRO" || currentPlan === "BUSINESS",
    },
    {
      name: "BUSINESS",
      price: 9999,
      description: "For established businesses",
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
      ctaText:
        currentPlan === "BUSINESS" ? "Current Plan" : "Upgrade to BUSINESS",
      disabled: currentPlan === "BUSINESS",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 md:mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 ${
            isMobile
              ? "text-2xl sm:text-3xl"
              : "text-3xl md:text-4xl lg:text-5xl"
          }`}
        >
          Choose Your Plan
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`text-gray-600 mx-auto ${
            isMobile
              ? "text-sm sm:text-base max-w-md"
              : "text-base md:text-lg max-w-2xl"
          }`}
        >
          Unlock premium features and grow your business with our flexible
          pricing plans
        </motion.p>
      </div>

      {/* Current Plan Badge */}
      {subscriptionData?.subscription && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`bg-emerald-100 rounded-full flex items-center justify-center shrink-0 ${
                isMobile ? "w-8 h-8" : "w-10 h-10"
              }`}
            >
              <span className="material-symbols-outlined text-emerald-600 text-lg sm:text-xl">
                workspace_premium
              </span>
            </div>
            <div className="min-w-0">
              <p
                className={`font-semibold text-gray-900 ${
                  isMobile ? "text-sm" : "text-base"
                }`}
              >
                Current Plan: {currentPlan}
              </p>
              {subscriptionData.subscription.daysRemaining && (
                <p
                  className={`text-gray-600 ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                >
                  {subscriptionData.subscription.daysRemaining} days remaining
                </p>
              )}
            </div>
          </div>
          {subscriptionData.subscription.isPremium && (
            <span
              className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-100 text-amber-700 rounded-full font-semibold flex items-center gap-1 sm:gap-2 ${
                isMobile ? "text-xs self-start" : "text-sm"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                verified
              </span>
              <span>Premium Active</span>
            </span>
          )}
        </motion.div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10 md:mb-12">
        {pricingTiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 ${
              tier.recommended
                ? "border-emerald-500 ring-2 sm:ring-4 ring-emerald-100"
                : "border-gray-200"
            } p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col`}
          >
            {/* Recommended Badge */}
            {tier.recommended && (
              <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                <span
                  className={`bg-linear-to-r from-emerald-600 to-teal-500 text-white px-3 py-0.5 sm:px-4 sm:py-1 rounded-full font-semibold shadow-lg ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                >
                  Most Popular
                </span>
              </div>
            )}

            {/* Plan Name */}
            <div className="mb-3 sm:mb-4">
              <h3
                className={`font-bold text-gray-900 mb-1 sm:mb-2 ${
                  isMobile ? "text-lg sm:text-xl" : "text-xl md:text-2xl"
                }`}
              >
                {tier.name}
              </h3>
              <p
                className={`text-gray-600 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                {tier.description}
              </p>
            </div>

            {/* Price */}
            <div className="mb-4 sm:mb-5 md:mb-6">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span
                  className={`font-bold text-gray-900 ${
                    isMobile ? "text-2xl sm:text-3xl" : "text-3xl md:text-4xl"
                  }`}
                >
                  KES {tier.price.toLocaleString()}
                </span>
                <span
                  className={`text-gray-600 ${
                    isMobile ? "text-sm" : "text-base"
                  }`}
                >
                  /month
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6 sm:mb-7 md:mb-8 flex-1">
              <ul className="space-y-2 sm:space-y-3">
                {tier.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-start gap-2 sm:gap-3"
                  >
                    <span
                      className={`material-symbols-outlined shrink-0 ${
                        tier.color === "emerald"
                          ? "text-emerald-600"
                          : tier.color === "amber"
                            ? "text-amber-600"
                            : "text-gray-400"
                      } ${isMobile ? "text-sm mt-0.5" : "text-sm mt-0.5"}`}
                    >
                      check_circle
                    </span>
                    <span
                      className={`text-gray-700 ${
                        isMobile ? "text-xs sm:text-sm" : "text-sm"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={() =>
                !tier.disabled &&
                tier.name !== "FREE" &&
                handleUpgrade(tier.name as "PRO" | "BUSINESS")
              }
              disabled={tier.disabled || initiateSubscription.isPending}
              className={`w-full rounded-lg sm:rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation ${
                tier.recommended
                  ? "bg-linear-to-r from-emerald-600 to-teal-500 text-white hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  : tier.color === "amber"
                    ? "bg-linear-to-r from-amber-600 to-orange-500 text-white hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    : "bg-gray-100 text-gray-600 cursor-not-allowed"
              } ${
                isMobile
                  ? "py-2.5 px-4 text-xs sm:text-sm"
                  : "py-3 px-6 text-sm"
              }`}
            >
              {initiateSubscription.isPending && selectedPlan === tier.name ? (
                <>
                  <div
                    className={`border-2 border-white/20 border-t-white rounded-full animate-spin ${
                      isMobile ? "w-3 h-3" : "w-4 h-4"
                    }`}
                  />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{tier.ctaText}</span>
                  {!tier.disabled && tier.name !== "FREE" && (
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  )}
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-5 md:p-6 lg:p-8 mb-8 sm:mb-10"
      >
        <h2
          className={`font-bold text-gray-900 mb-4 sm:mb-5 md:mb-6 ${
            isMobile ? "text-lg sm:text-xl" : "text-xl md:text-2xl"
          }`}
        >
          Feature Comparison
        </h2>
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <div className="min-w-[42rem] sm:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th
                    className={`text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    Feature
                  </th>
                  <th
                    className={`text-center py-3 px-2 sm:px-4 font-semibold text-gray-900 ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    FREE
                  </th>
                  <th
                    className={`text-center py-3 px-2 sm:px-4 font-semibold text-emerald-600 ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    PRO
                  </th>
                  <th
                    className={`text-center py-3 px-2 sm:px-4 font-semibold text-amber-600 ${
                      isMobile ? "text-sm" : "text-base"
                    }`}
                  >
                    BUSINESS
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: "Service Listings",
                    free: "5",
                    pro: "Unlimited",
                    business: "Unlimited",
                  },
                  {
                    feature: "Job Applications",
                    free: "14/week",
                    pro: "Unlimited",
                    business: "Unlimited",
                  },
                  {
                    feature: "Analytics",
                    free: "Basic",
                    pro: "Advanced",
                    business: "Advanced",
                  },
                  {
                    feature: "Support",
                    free: "Standard",
                    pro: "Priority",
                    business: "24/7 Premium",
                  },
                  {
                    feature: "Profile Badge",
                    free: false,
                    pro: true,
                    business: true,
                  },
                  {
                    feature: "Search Priority",
                    free: false,
                    pro: true,
                    business: true,
                  },
                  {
                    feature: "Team Accounts",
                    free: false,
                    pro: false,
                    business: "Up to 5",
                  },
                  {
                    feature: "API Access",
                    free: false,
                    pro: false,
                    business: true,
                  },
                  {
                    feature: "Custom Branding",
                    free: false,
                    pro: false,
                    business: true,
                  },
                ].map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td
                      className={`py-3 px-2 sm:px-4 text-gray-700 ${
                        isMobile ? "text-xs sm:text-sm" : "text-sm"
                      }`}
                    >
                      {row.feature}
                    </td>
                    <td
                      className={`py-3 px-2 sm:px-4 text-center ${
                        isMobile ? "text-xs sm:text-sm" : "text-sm"
                      }`}
                    >
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <span className="material-symbols-outlined text-gray-400 text-lg">
                            check
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-gray-300 text-lg">
                            close
                          </span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.free}</span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-2 sm:px-4 text-center ${
                        isMobile ? "text-xs sm:text-sm" : "text-sm"
                      }`}
                    >
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <span className="material-symbols-outlined text-emerald-600 text-lg">
                            check
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-gray-300 text-lg">
                            close
                          </span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.pro}</span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-2 sm:px-4 text-center ${
                        isMobile ? "text-xs sm:text-sm" : "text-sm"
                      }`}
                    >
                      {typeof row.business === "boolean" ? (
                        row.business ? (
                          <span className="material-symbols-outlined text-amber-600 text-lg">
                            check
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-gray-300 text-lg">
                            close
                          </span>
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
        </div>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={`bg-linear-to-r from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8`}
      >
        <h2
          className={`font-bold text-gray-900 mb-4 sm:mb-5 md:mb-6 text-center ${
            isMobile ? "text-lg sm:text-xl" : "text-xl md:text-2xl"
          }`}
        >
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {[
            {
              question: "Can I change my plan anytime?",
              answer:
                "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
            },
            {
              question: "What payment methods do you accept?",
              answer:
                "We currently accept M-Pesa via Safaricom Daraja STK Push.",
            },
            {
              question: "Is there a refund policy?",
              answer:
                "We offer a 7-day money-back guarantee if you're not satisfied with your subscription.",
            },
            {
              question: "Do subscriptions auto-renew?",
              answer:
                "Yes, subscriptions auto-renew monthly unless you cancel before the renewal date.",
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm"
            >
              <h3
                className={`font-semibold text-gray-900 mb-1 sm:mb-2 ${
                  isMobile ? "text-sm sm:text-base" : "text-base"
                }`}
              >
                {faq.question}
              </h3>
              <p
                className={`text-gray-600 ${
                  isMobile ? "text-xs sm:text-sm" : "text-sm"
                }`}
              >
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      <StkPhonePromptModal
        isOpen={Boolean(planForPhonePrompt)}
        title="Confirm STK phone"
        description="Use the phone number that should receive this subscription STK prompt."
        phoneNumber={stkPhoneNumber}
        onPhoneNumberChange={setStkPhoneNumber}
        onClose={() => setPlanForPhonePrompt(null)}
        onConfirm={handleConfirmUpgrade}
        confirmLabel="Pay with M-Pesa"
        isSubmitting={initiateSubscription.isPending}
        isLoadingDefaultPhone={isLoadingStkPhone}
      />
    </div>
  );
};

export default PremiumPage;
