import prisma from "@/lib/prisma";
import { ChurnRiskLevel } from "@/generated/prisma/client";

interface ReEngagementStrategy {
  type: string;
  template: string;
  discountPercent: number;
  priority: number;
}

const RE_ENGAGEMENT_STRATEGIES: Record<ChurnRiskLevel, ReEngagementStrategy> = {
  LOW: {
    type: 'NONE',
    template: '',
    discountPercent: 0,
    priority: 0
  },
  MEDIUM: {
    type: 'EMAIL',
    template: 'churn-medium',
    discountPercent: 10,
    priority: 1
  },
  HIGH: {
    type: 'EMAIL_NOTIFICATION',
    template: 'churn-high',
    discountPercent: 20,
    priority: 2
  },
  CRITICAL: {
    type: 'PERSONAL_CALL',
    template: 'churn-critical',
    discountPercent: 30,
    priority: 3
  }
};

/**
 * Trigger re-engagement campaign for at-risk user
 */
export async function triggerReEngagement(
  userId: string,
  churnScoreId: string,
  riskLevel: ChurnRiskLevel
): Promise<{ success: boolean; interventionId?: string }> {
  
  const strategy = RE_ENGAGEMENT_STRATEGIES[riskLevel];
  
  if (strategy.type === 'NONE') {
    return { success: false };
  }

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      profile: {
        select: { hourlyRate: true }
      }
    }
  });

  if (!user || !user.email) {
    console.error(`Cannot re-engage user ${userId}: No email found`);
    return { success: false };
  }

  // Generate discount code if applicable
  let discountCode = null;
  if (strategy.discountPercent > 0) {
    discountCode = await createDiscountCode(userId, strategy.discountPercent, riskLevel);
  }

  // Create message
  const message = buildReEngagementMessage(
    user.name || 'Valued Professional',
    riskLevel,
    strategy.discountPercent,
    discountCode
  );

  // Create intervention record
  const intervention = await prisma.churnIntervention.create({
    data: {
      churnScoreId,
      userId,
      type: strategy.type,
      message,
      executed: false
    }
  });

  // Execute intervention
  try {
    if (strategy.type.includes('EMAIL')) {
      await sendReEngagementEmail(user.email, user.name || 'Professional', riskLevel, message, discountCode);
    }
    
    if (strategy.type.includes('NOTIFICATION')) {
      await sendReEngagementNotification(userId, riskLevel, message);
    }

    // Mark as executed
    await prisma.churnIntervention.update({
      where: { id: intervention.id },
      data: {
        executed: true,
        executedAt: new Date(),
        successful: true
      }
    });

    return { success: true, interventionId: intervention.id };
  } catch (error) {
    console.error(`Error executing re-engagement for user ${userId}:`, error);
    
    await prisma.churnIntervention.update({
      where: { id: intervention.id },
      data: {
        executed: true,
        executedAt: new Date(),
        successful: false,
        response: error instanceof Error ? error.message : String(error)
      }
    });

    return { success: false, interventionId: intervention.id };
  }
}

/**
 * Create a discount promo code for re-engagement
 */
async function createDiscountCode(
  userId: string,
  discountPercent: number,
  riskLevel: ChurnRiskLevel
): Promise<string> {
  const code = `COMEBACK${riskLevel}${Date.now().toString().slice(-6)}`;
  
  await prisma.promoCode.create({
    data: {
      code,
      description: `Re-engagement offer for ${riskLevel} risk user`,
      type: 'PERCENTAGE',
      value: discountPercent,
      minOrderAmount: 0,
      usageLimit: 1,
      perUserLimit: 1,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true
    }
  });

  return code;
}

/**
 * Build personalized re-engagement message
 */
function buildReEngagementMessage(
  userName: string,
  riskLevel: ChurnRiskLevel,
  discountPercent: number,
  discountCode: string | null
): string {
  const messages: Record<ChurnRiskLevel, string> = {
    LOW: '',
    MEDIUM: `Hi ${userName},\n\nWe noticed you haven't been as active lately. We miss having you on our platform!\n\nAs a thank you for being part of our community, here's ${discountPercent}% off your next service booking.\n\nUse code: ${discountCode}\n\nLet's get you back in action!`,
    HIGH: `Dear ${userName},\n\nWe really value your presence on JustInTime and noticed you've been less active recently.\n\nWe want to make sure you're getting the most out of our platform. Here's a special ${discountPercent}% discount to help you get back on track.\n\nCode: ${discountCode}\n\nPlus, our support team is here to help with anything you need. Just reach out!`,
    CRITICAL: `${userName},\n\nYour account is important to us. Our team has noticed a significant drop in your activity.\n\nWe'd love to understand what's happening and how we can help. As a gesture of goodwill, we're offering you ${discountPercent}% off your next booking.\n\nCode: ${discountCode}\n\nOne of our account managers will reach out to you personally to discuss how we can better support your success.\n\nLooking forward to hearing from you.`
  };

  return messages[riskLevel];
}

/**
 * Send re-engagement email
 */
async function sendReEngagementEmail(
  email: string,
  name: string,
  riskLevel: ChurnRiskLevel,
  message: string,
  discountCode: string | null
): Promise<void> {
  // Import email sending function
  const { sendEmail } = await import('@/lib/email');
  
  const subject = riskLevel === 'CRITICAL'
    ? '🚨 We Need to Talk - Special Offer Inside'
    : riskLevel === 'HIGH'
    ? '💝 We Miss You! Special Discount Waiting'
    : 'Come Back to JustInTime - Exclusive Offer';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">We Miss You! 🎯</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        ${message.split('\n').map(line => `<p style="color: #374151; line-height: 1.6;">${line}</p>`).join('')}
        
        ${discountCode ? `
          <div style="background: white; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Exclusive Code</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 2px;">${discountCode}</p>
            <p style="margin: 0; color: #6b7280; font-size: 12px;">Valid for 30 days</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://justintime.app/dashboard" style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Get Back in Action →
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>You're receiving this because we value your presence on JustInTime.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    html
  });
}

/**
 * Send re-engagement push notification
 */
async function sendReEngagementNotification(
  userId: string,
  riskLevel: ChurnRiskLevel,
  message: string
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      title: riskLevel === 'CRITICAL' ? '🚨 Special Offer for You' : '💝 We Miss You!',
      message: message.substring(0, 200) + '...',
      type: 'CHURN_RE_ENGAGEMENT'
    }
  });
}

/**
 * Auto-trigger re-engagement for high-risk users
 */
export async function autoTriggerReEngagement(): Promise<{
  triggered: number;
  successful: number;
  failed: number;
}> {
  // Find recent high-risk scores without interventions
  const highRiskScores = await prisma.churnScore.findMany({
    where: {
      riskLevel: { in: ['HIGH', 'CRITICAL'] },
      calculatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      },
      interventions: {
        none: {}
      }
    },
    include: {
      user: {
        select: { id: true, email: true }
      }
    }
  });

  const results = {
    triggered: 0,
    successful: 0,
    failed: 0
  };

  for (const score of highRiskScores) {
    results.triggered++;
    
    const result = await triggerReEngagement(score.userId, score.id, score.riskLevel);
    
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
    }
  }

  return results;
}
