import prisma from "@/lib/prisma";
import { PartnerCategory, LoyaltyTier } from "@/generated/prisma/client";

export const MOCK_PARTNERS = [
  // HARDWARE & TOOLS
  {
    name: "HomeDepot Kenya",
    category: "HARDWARE_TOOLS" as PartnerCategory,
    logo: "🏗️",
    description: "Leading home improvement and hardware supplier",
    website: "https://homedepot.co.ke",
    rewards: [
      {
        title: "15% Off Power Tools",
        description:
          "Get 15% discount on all power tools including drills, saws, and sanders",
        discountType: "PERCENTAGE",
        discountValue: 15,
        minTierRequired: "SILVER" as LoyaltyTier,
        termsConditions:
          "Valid on in-store purchases only. Cannot be combined with other offers.",
      },
      {
        title: "20% Off Paint Supplies",
        description: "Save 20% on all paint, brushes, and painting supplies",
        discountType: "PERCENTAGE",
        discountValue: 20,
        minTierRequired: "GOLD" as LoyaltyTier,
      },
    ],
  },

  // AUTOMOTIVE
  {
    name: "AutoParts Direct",
    category: "AUTOMOTIVE" as PartnerCategory,
    logo: "🚗",
    description: "Quality automotive parts and accessories",
    website: "https://autopartsdirect.co.ke",
    rewards: [
      {
        title: "10% Off Car Parts",
        description: "10% discount on all automotive parts and accessories",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minTierRequired: "BRONZE" as LoyaltyTier,
      },
      {
        title: "Free Oil Change Kit",
        description: "Complimentary oil change kit with qualifying purchase",
        discountType: "FREE_ITEM",
        discountValue: 0,
        minTierRequired: "PLATINUM" as LoyaltyTier,
        maxRedemptions: 100,
      },
    ],
  },

  // INSURANCE
  {
    name: "Britam Insurance",
    category: "INSURANCE" as PartnerCategory,
    logo: "🛡️",
    description: "Professional liability and equipment insurance",
    website: "https://britam.com",
    rewards: [
      {
        title: "15% Off Liability Insurance",
        description: "Save 15% on professional liability insurance premiums",
        discountType: "PERCENTAGE",
        discountValue: 15,
        minTierRequired: "GOLD" as LoyaltyTier,
      },
      {
        title: "25% Off Equipment Insurance",
        description: "Protect your tools with 25% off equipment insurance",
        discountType: "PERCENTAGE",
        discountValue: 25,
        minTierRequired: "PLATINUM" as LoyaltyTier,
      },
    ],
  },

  // EQUIPMENT RENTAL
  {
    name: "Atlas Equipment Rentals",
    category: "EQUIPMENT_RENTAL" as PartnerCategory,
    logo: "🏗️",
    description: "Professional equipment rental services",
    website: "https://atlasequipment.co.ke",
    rewards: [
      {
        title: "20% Off Equipment Rentals",
        description: "Get 20% off on all equipment rental orders",
        discountType: "PERCENTAGE",
        discountValue: 20,
        minTierRequired: "SILVER" as LoyaltyTier,
      },
      {
        title: "Free Weekend Rental - Monthly",
        description: "One free weekend rental per month on any equipment",
        discountType: "FREE_ITEM",
        discountValue: 0,
        minTierRequired: "DIAMOND" as LoyaltyTier,
        maxRedemptions: 50,
      },
    ],
  },

  // SUPPLIES
  {
    name: "BuildRight Supplies",
    category: "SUPPLIES" as PartnerCategory,
    logo: "📦",
    description: "Construction and building materials supplier",
    website: "https://buildright.co.ke",
    rewards: [
      {
        title: "10% Off Building Materials",
        description: "Save 10% on cement, steel, and building materials",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minTierRequired: "BRONZE" as LoyaltyTier,
      },
      {
        title: "Free Delivery on Large Orders",
        description: "Free delivery on orders over KES 50,000",
        discountType: "FREE_ITEM",
        discountValue: 0,
        minTierRequired: "GOLD" as LoyaltyTier,
      },
    ],
  },

  // SOFTWARE
  {
    name: "Canva Pro",
    category: "SOFTWARE" as PartnerCategory,
    logo: "🎨",
    description: "Professional design software for marketing materials",
    website: "https://canva.com",
    rewards: [
      {
        title: "6 Months Free Canva Pro",
        description: "Get 6 months of Canva Pro subscription free",
        discountType: "FREE_ITEM",
        discountValue: 0,
        minTierRequired: "GOLD" as LoyaltyTier,
        maxRedemptions: 200,
      },
    ],
  },

  // TRAINING
  {
    name: "Udemy Business",
    category: "TRAINING" as PartnerCategory,
    logo: "📚",
    description: "Professional skills training and certification",
    website: "https://udemy.com",
    rewards: [
      {
        title: "50% Off Professional Courses",
        description: "Half price on all professional development courses",
        discountType: "PERCENTAGE",
        discountValue: 50,
        minTierRequired: "SILVER" as LoyaltyTier,
      },
      {
        title: "Free Business Subscription - 3 Months",
        description: "3 months free access to Udemy Business library",
        discountType: "FREE_ITEM",
        discountValue: 0,
        minTierRequired: "DIAMOND" as LoyaltyTier,
        maxRedemptions: 50,
      },
    ],
  },
];

/**
 * Seed partner ecosystem
 */
export async function seedPartners() {
  const results = {
    partnersCreated: 0,
    rewardsCreated: 0,
  };

  for (const partnerData of MOCK_PARTNERS) {
    const { rewards, ...partnerInfo } = partnerData;

    // Check if partner already exists
    const existing = await prisma.partner.findFirst({
      where: { name: partnerInfo.name },
    });

    if (existing) {
      console.log(`Partner ${partnerInfo.name} already exists, skipping...`);
      continue;
    }

    // Create partner with rewards
    const partner = await prisma.partner.create({
      data: {
        ...partnerInfo,
        rewards: {
          create: rewards.map((reward) => {
            const maxRedemptions =
              "maxRedemptions" in reward ? reward.maxRedemptions : undefined;

            return {
              ...reward,
              expiryDate: maxRedemptions
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year for limited rewards
                : null,
            };
          }),
        },
      },
      include: {
        rewards: true,
      },
    });

    results.partnersCreated++;
    results.rewardsCreated += partner.rewards.length;
  }

  return results;
}
