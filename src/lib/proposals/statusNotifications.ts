import type { ProposalStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

const STATUS_LABELS: Record<ProposalStatus, string> = {
  PENDING: "In Review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

const STATUS_DEFAULT_REASONS: Record<ProposalStatus, string> = {
  PENDING: "Your application is currently under review.",
  ACCEPTED:
    "Your application was accepted. Check your dashboard for onboarding details.",
  REJECTED: "The client has chosen another provider for this job.",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeReason(
  reason: string | undefined | null,
  status: ProposalStatus,
) {
  const trimmed = reason?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return STATUS_DEFAULT_REASONS[status];
}

export interface ProposalStatusFeedbackInput {
  providerId: string;
  actorUserId: string;
  actorName?: string | null;
  actorRole?: string | null;
  jobId: string;
  jobTitle: string;
  status: ProposalStatus;
  reason?: string | null;
}

export async function sendProviderApplicationStatusFeedback(
  input: ProposalStatusFeedbackInput,
) {
  const statusLabel = STATUS_LABELS[input.status] ?? "Updated";
  const normalizedReason = normalizeReason(input.reason, input.status);
  const actorLabel = input.actorName?.trim() || "Client";
  const subject = `Application ${statusLabel}: ${input.jobTitle}`;
  const inAppMessage = `${statusLabel} for \"${input.jobTitle}\". Reason: ${normalizedReason}`;
  const safeJobTitle = escapeHtml(input.jobTitle);
  const safeReason = escapeHtml(normalizedReason);
  const safeActorLabel = escapeHtml(actorLabel);

  try {
    await sendComprehensiveNotification({
      userId: input.providerId,
      title: `Application update: ${statusLabel}`,
      message: inAppMessage,
      type: "PROPOSAL_STATUS_UPDATE",
      emailSubject: `${subject} - JustInTime`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <h2 style="color: #0f766e;">Application status update</h2>
          <p>Your application for <strong>${safeJobTitle}</strong> is now <strong>${statusLabel}</strong>.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Updated by:</strong> ${safeActorLabel}</p>
            <p style="margin: 0;"><strong>Reason:</strong> ${safeReason}</p>
          </div>
          <a href="${process.env.NEXTAUTH_URL}/dashboard/jobs?tab=applied" style="display: inline-block; background: #0f766e; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">View application tracker</a>
        </div>
      `,
    });
  } catch (error) {
    console.error("[PROPOSAL_STATUS_NOTIFICATION]", error);
  }

  try {
    if (input.actorUserId !== input.providerId) {
      await prisma.message.create({
        data: {
          senderId: input.actorUserId,
          receiverId: input.providerId,
          content: `Application update for \"${input.jobTitle}\": ${statusLabel}. Reason: ${normalizedReason}`,
          isRead: false,
          isDelivered: false,
        },
      });
    }
  } catch (error) {
    console.error("[PROPOSAL_STATUS_MESSAGE]", error);
  }
}
