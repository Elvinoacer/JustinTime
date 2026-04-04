import type { ProposalStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  JOB_LIFECYCLE_EVENT_TYPES,
  recordJobLifecycleEvent,
} from "@/lib/jobs/lifecycleTimeline";
import { sendProviderApplicationStatusFeedback } from "@/lib/proposals/statusNotifications";

export type ProposalDecisionStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export const PROPOSAL_DECISION_ERRORS = {
  NOT_FOUND: "PROPOSAL_NOT_FOUND",
  UNAUTHORIZED: "PROPOSAL_FORBIDDEN",
  JOB_NOT_OPEN: "JOB_NOT_OPEN",
  MAX_ACCEPTED_PROVIDERS_REACHED: "MAX_ACCEPTED_PROVIDERS_REACHED",
  ALREADY_ACCEPTED: "PROPOSAL_ALREADY_ACCEPTED",
  ALREADY_REJECTED: "PROPOSAL_ALREADY_REJECTED",
  NOT_PENDING: "PROPOSAL_NOT_PENDING",
} as const;

const DEFAULT_REASON_BY_STATUS: Record<ProposalStatus, string> = {
  PENDING: "Your application is currently under review.",
  ACCEPTED:
    "Your application has been accepted. Please check your dashboard for next steps.",
  REJECTED: "The client has chosen another provider for this job.",
};

const AUTO_REJECTION_REASON =
  "The client completed hiring for this job and closed remaining open applications.";

function normalizeReason(
  reason: string | undefined | null,
  status: ProposalStatus,
) {
  const trimmed = reason?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return DEFAULT_REASON_BY_STATUS[status];
}

type ApplyProposalDecisionInput = {
  proposalId: string;
  expectedJobId?: string;
  actorUserId: string;
  actorName?: string | null;
  actorRole?: string | null;
  targetStatus: ProposalDecisionStatus;
  reason?: string;
};

type DecisionPayload = {
  id: string;
  jobId: string;
  providerId: string;
  status: ProposalStatus;
  price: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type ApplyProposalDecisionResult = {
  proposal: DecisionPayload;
  acceptedProvidersCount: number;
  acceptedProvidersLimit: number;
  hasReachedAcceptedProvidersLimit: boolean;
  autoRejectedProposalIds: string[];
};

export async function applyProposalDecision({
  proposalId,
  expectedJobId,
  actorUserId,
  actorName,
  actorRole,
  targetStatus,
  reason,
}: ApplyProposalDecisionInput): Promise<ApplyProposalDecisionResult> {
  const normalizedActorName = actorName?.trim() || "Client";
  const normalizedActorRole = actorRole?.trim() || "CLIENT";

  const result = await prisma.$transaction(async (tx) => {
    const proposal = await tx.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        jobId: true,
        providerId: true,
        status: true,
        price: true,
        createdAt: true,
        updatedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            clientId: true,
            deadline: true,
            location: true,
            status: true,
            maxAcceptedProviders: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new Error(PROPOSAL_DECISION_ERRORS.NOT_FOUND);
    }

    if (expectedJobId && proposal.jobId !== expectedJobId) {
      throw new Error(PROPOSAL_DECISION_ERRORS.NOT_FOUND);
    }

    if (proposal.job.clientId !== actorUserId) {
      throw new Error(PROPOSAL_DECISION_ERRORS.UNAUTHORIZED);
    }

    const createHistory = async (
      trackedProposalId: string,
      status: ProposalStatus,
      statusReason: string,
      fromStatus?: ProposalStatus,
    ) => {
      await tx.proposalStatusHistory.create({
        data: {
          proposalId: trackedProposalId,
          status,
          reason: statusReason,
          changedByUserId: actorUserId,
          changedByName: normalizedActorName,
          changedByRole: normalizedActorRole,
        },
      });

      await recordJobLifecycleEvent(
        {
          jobId: proposal.jobId,
          proposalId: trackedProposalId,
          eventType: JOB_LIFECYCLE_EVENT_TYPES.PROPOSAL_STATUS_CHANGED,
          fromState: fromStatus ?? status,
          toState: status,
          reason: statusReason,
          actorUserId,
          actorName: normalizedActorName,
          actorRole: normalizedActorRole,
        },
        tx,
      );
    };

    if (targetStatus === "PENDING") {
      if (proposal.status !== "PENDING") {
        throw new Error(PROPOSAL_DECISION_ERRORS.NOT_PENDING);
      }

      const statusReason = normalizeReason(reason, "PENDING");
      await createHistory(
        proposal.id,
        "PENDING",
        statusReason,
        proposal.status,
      );

      return {
        proposal,
        jobTitle: proposal.job.title,
        statusReason,
        autoRejected: [] as Array<{
          id: string;
          providerId: string;
          reason: string;
        }>,
        acceptedProvidersCount: await tx.proposal.count({
          where: {
            jobId: proposal.jobId,
            status: "ACCEPTED",
          },
        }),
        acceptedProvidersLimit:
          typeof proposal.job.maxAcceptedProviders === "number" &&
          proposal.job.maxAcceptedProviders > 0
            ? proposal.job.maxAcceptedProviders
            : 1,
        hasReachedAcceptedProvidersLimit: false,
      };
    }

    if (targetStatus === "REJECTED") {
      if (proposal.status === "REJECTED") {
        throw new Error(PROPOSAL_DECISION_ERRORS.ALREADY_REJECTED);
      }

      if (proposal.status !== "PENDING") {
        throw new Error(PROPOSAL_DECISION_ERRORS.NOT_PENDING);
      }

      const statusReason = normalizeReason(reason, "REJECTED");
      const updatedProposal = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: "REJECTED" },
        select: {
          id: true,
          jobId: true,
          providerId: true,
          status: true,
          price: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await createHistory(
        updatedProposal.id,
        "REJECTED",
        statusReason,
        proposal.status,
      );

      return {
        proposal: updatedProposal,
        jobTitle: proposal.job.title,
        statusReason,
        autoRejected: [] as Array<{
          id: string;
          providerId: string;
          reason: string;
        }>,
        acceptedProvidersCount: await tx.proposal.count({
          where: {
            jobId: proposal.jobId,
            status: "ACCEPTED",
          },
        }),
        acceptedProvidersLimit:
          typeof proposal.job.maxAcceptedProviders === "number" &&
          proposal.job.maxAcceptedProviders > 0
            ? proposal.job.maxAcceptedProviders
            : 1,
        hasReachedAcceptedProvidersLimit: false,
      };
    }

    if (proposal.job.status !== "OPEN") {
      throw new Error(PROPOSAL_DECISION_ERRORS.JOB_NOT_OPEN);
    }

    if (proposal.status === "ACCEPTED") {
      throw new Error(PROPOSAL_DECISION_ERRORS.ALREADY_ACCEPTED);
    }

    if (proposal.status !== "PENDING") {
      throw new Error(PROPOSAL_DECISION_ERRORS.NOT_PENDING);
    }

    const acceptedProvidersLimit =
      typeof proposal.job.maxAcceptedProviders === "number" &&
      proposal.job.maxAcceptedProviders > 0
        ? proposal.job.maxAcceptedProviders
        : 1;

    const acceptedProvidersCount = await tx.proposal.count({
      where: {
        jobId: proposal.jobId,
        status: "ACCEPTED",
      },
    });

    if (acceptedProvidersCount >= acceptedProvidersLimit) {
      throw new Error(PROPOSAL_DECISION_ERRORS.MAX_ACCEPTED_PROVIDERS_REACHED);
    }

    const acceptedReason = normalizeReason(reason, "ACCEPTED");

    const updatedProposal = await tx.proposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED" },
      select: {
        id: true,
        jobId: true,
        providerId: true,
        status: true,
        price: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createHistory(
      updatedProposal.id,
      "ACCEPTED",
      acceptedReason,
      proposal.status,
    );

    const updatedAcceptedProvidersCount = acceptedProvidersCount + 1;
    const hasReachedAcceptedProvidersLimit =
      updatedAcceptedProvidersCount >= acceptedProvidersLimit;

    let autoRejected: Array<{
      id: string;
      providerId: string;
      reason: string;
    }> = [];

    if (hasReachedAcceptedProvidersLimit) {
      const pendingProposals = await tx.proposal.findMany({
        where: {
          jobId: proposal.jobId,
          id: { not: proposalId },
          status: "PENDING",
        },
        select: {
          id: true,
          providerId: true,
        },
      });

      if (pendingProposals.length > 0) {
        const pendingProposalIds = pendingProposals.map((entry) => entry.id);

        await tx.proposal.updateMany({
          where: {
            id: { in: pendingProposalIds },
          },
          data: {
            status: "REJECTED",
          },
        });

        await tx.proposalStatusHistory.createMany({
          data: pendingProposals.map((entry) => ({
            proposalId: entry.id,
            status: "REJECTED",
            reason: AUTO_REJECTION_REASON,
            changedByUserId: actorUserId,
            changedByName: normalizedActorName,
            changedByRole: normalizedActorRole,
          })),
        });

        await Promise.all(
          pendingProposals.map((entry) =>
            recordJobLifecycleEvent(
              {
                jobId: proposal.jobId,
                proposalId: entry.id,
                eventType: JOB_LIFECYCLE_EVENT_TYPES.PROPOSAL_STATUS_CHANGED,
                fromState: "PENDING",
                toState: "REJECTED",
                reason: AUTO_REJECTION_REASON,
                actorUserId,
                actorName: normalizedActorName,
                actorRole: normalizedActorRole,
                idempotencyKey: `proposal:${entry.id}:auto-rejected:${updatedProposal.id}`,
              },
              tx,
            ),
          ),
        );

        autoRejected = pendingProposals.map((entry) => ({
          id: entry.id,
          providerId: entry.providerId,
          reason: AUTO_REJECTION_REASON,
        }));
      }

      await tx.job.update({
        where: { id: proposal.jobId },
        data: { status: "IN_PROGRESS" },
      });

      await recordJobLifecycleEvent(
        {
          jobId: proposal.jobId,
          eventType: JOB_LIFECYCLE_EVENT_TYPES.JOB_STATUS_CHANGED,
          fromState: proposal.job.status,
          toState: "IN_PROGRESS",
          reason:
            "Accepted providers limit reached. Job moved to in-progress execution.",
          actorUserId,
          actorName: normalizedActorName,
          actorRole: normalizedActorRole,
          idempotencyKey: `job:${proposal.jobId}:status:in-progress:${updatedProposal.id}`,
        },
        tx,
      );
    }

    const existingBooking = await tx.booking.findFirst({
      where: {
        jobId: proposal.jobId,
        providerId: proposal.providerId,
      },
      select: { id: true },
    });

    if (!existingBooking) {
      const newBooking = await tx.booking.create({
        data: {
          clientId: proposal.job.clientId,
          providerId: proposal.providerId,
          jobId: proposal.jobId,
          status: "CONFIRMED",
          date:
            proposal.job.deadline ??
            new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          totalAmount: proposal.price,
          location: proposal.job.location,
        },
      });

      await recordJobLifecycleEvent(
        {
          jobId: proposal.jobId,
          proposalId: updatedProposal.id,
          bookingId: newBooking.id,
          eventType: JOB_LIFECYCLE_EVENT_TYPES.BOOKING_CREATED,
          fromState: null,
          toState: "CONFIRMED",
          reason: "Booking created from accepted proposal.",
          actorUserId,
          actorName: normalizedActorName,
          actorRole: normalizedActorRole,
          idempotencyKey: `booking:${newBooking.id}:created`,
        },
        tx,
      );
    }

    return {
      proposal: updatedProposal,
      jobTitle: proposal.job.title,
      statusReason: acceptedReason,
      autoRejected,
      acceptedProvidersCount: updatedAcceptedProvidersCount,
      acceptedProvidersLimit,
      hasReachedAcceptedProvidersLimit,
    };
  });

  const notifications = [
    sendProviderApplicationStatusFeedback({
      providerId: result.proposal.providerId,
      actorUserId,
      actorName: normalizedActorName,
      actorRole: normalizedActorRole,
      jobId: result.proposal.jobId,
      jobTitle: result.jobTitle,
      status: result.proposal.status,
      reason: result.statusReason,
    }),
    ...result.autoRejected.map((entry) =>
      sendProviderApplicationStatusFeedback({
        providerId: entry.providerId,
        actorUserId,
        actorName: normalizedActorName,
        actorRole: normalizedActorRole,
        jobId: result.proposal.jobId,
        jobTitle: result.jobTitle,
        status: "REJECTED",
        reason: entry.reason,
      }),
    ),
  ];

  await Promise.allSettled(notifications);

  return {
    proposal: result.proposal,
    acceptedProvidersCount: result.acceptedProvidersCount,
    acceptedProvidersLimit: result.acceptedProvidersLimit,
    hasReachedAcceptedProvidersLimit: result.hasReachedAcceptedProvidersLimit,
    autoRejectedProposalIds: result.autoRejected.map((entry) => entry.id),
  };
}
