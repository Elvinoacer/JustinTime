import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

type NotificationSender = (payload: {
  userId: string;
  title: string;
  message: string;
  type: string;
  emailSubject: string;
  emailHtml: string;
}) => Promise<unknown>;

const proposalSubmissionSchema = z
  .object({
    jobId: z.string().min(1, "Job is required"),
    amount: z.number().positive().optional(),
    price: z.number().positive().optional(),
    message: z.string().trim().optional(),
    coverLetter: z.string().trim().optional(),
    estimatedDays: z.number().int().positive().optional(),
    attachments: z.array(z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    const normalizedPrice = value.price ?? value.amount;
    const normalizedCoverLetter =
      (value.coverLetter && value.coverLetter.trim()) ||
      (value.message && value.message.trim()) ||
      "";

    if (normalizedPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Proposal amount is required",
        path: ["price"],
      });
    }

    if (!normalizedCoverLetter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Proposal message is required",
        path: ["coverLetter"],
      });
      return;
    }

    if (normalizedCoverLetter.length < 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cover letter must be at least 50 characters",
        path: ["coverLetter"],
      });
    }
  });

export type ProposalSubmissionInput = z.input<typeof proposalSubmissionSchema>;

interface SubmitProposalOptions {
  providerId: string;
  input: ProposalSubmissionInput;
  enforceCreditLimit?: boolean;
  notifyClient?: boolean;
  dbClient?: SubmitProposalDbClient;
  notificationSender?: NotificationSender;
}

export type SubmitProposalDbClient = Pick<PrismaClient, "$transaction">;

type ProposalWithRelations = Prisma.ProposalGetPayload<{
  include: {
    job: {
      select: {
        id: true;
        title: true;
      };
    };
    provider: {
      select: {
        id: true;
        name: true;
        image: true;
      };
    };
  };
}>;

const MAX_SERIALIZABLE_RETRIES = 3;

export async function submitProposal({
  providerId,
  input,
  enforceCreditLimit = false,
  notifyClient = false,
  dbClient,
  notificationSender,
}: SubmitProposalOptions) {
  const effectiveDbClient = dbClient ?? (await import("@/lib/prisma")).default;

  const validatedData = proposalSubmissionSchema.parse(input);
  const jobId = validatedData.jobId;
  const price = validatedData.price ?? validatedData.amount ?? 0;
  const coverLetter =
    validatedData.coverLetter?.trim() ?? validatedData.message?.trim() ?? "";

  let proposal: ProposalWithRelations | null = null;
  let jobClientId: string | null = null;

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      proposal = await effectiveDbClient.$transaction(
        async (tx) => {
          const job = await tx.job.findUnique({
            where: { id: jobId },
            select: {
              id: true,
              status: true,
              clientId: true,
              maxApplicants: true,
              maxAcceptedProviders: true,
            },
          });

          if (!job) {
            throw new Error("JOB_NOT_FOUND");
          }

          if (job.status !== "OPEN") {
            throw new Error("JOB_NOT_OPEN");
          }

          if (job.clientId === providerId) {
            throw new Error("CANNOT_APPLY_TO_OWN_JOB");
          }

          jobClientId = job.clientId;

          const existingProposal = await tx.proposal.findFirst({
            where: { jobId, providerId },
            select: { id: true },
          });

          if (existingProposal) {
            throw new Error("PROPOSAL_ALREADY_EXISTS");
          }

          if (typeof job.maxApplicants === "number" && job.maxApplicants > 0) {
            const proposalCount = await tx.proposal.count({ where: { jobId } });
            if (proposalCount >= job.maxApplicants) {
              throw new Error("MAX_APPLICANTS_REACHED");
            }
          }

          const acceptedProvidersLimit =
            typeof job.maxAcceptedProviders === "number" &&
            job.maxAcceptedProviders > 0
              ? job.maxAcceptedProviders
              : 1;
          const acceptedProvidersCount = await tx.proposal.count({
            where: {
              jobId,
              status: "ACCEPTED",
            },
          });
          if (acceptedProvidersCount >= acceptedProvidersLimit) {
            throw new Error("MAX_ACCEPTED_PROVIDERS_REACHED");
          }

          if (enforceCreditLimit) {
            const user = await tx.user.findUnique({
              where: { id: providerId },
              select: {
                subscription: {
                  select: { plan: true, isActive: true },
                },
                wallet: {
                  select: { id: true, creditBalance: true },
                },
              },
            });

            const userPlan = user?.subscription?.plan || "FREE";
            const isActiveSubscription = user?.subscription?.isActive === true;

            if (userPlan === "FREE" || !isActiveSubscription) {
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

              const weeklyProposalCount = await tx.proposal.count({
                where: {
                  providerId,
                  createdAt: { gte: oneWeekAgo },
                },
              });

              const WEEKLY_LIMIT = 14;
              const PROPOSAL_CREDIT_COST = 2;

              if (weeklyProposalCount >= WEEKLY_LIMIT) {
                if (
                  !user?.wallet ||
                  user.wallet.creditBalance < PROPOSAL_CREDIT_COST
                ) {
                  throw new Error("INSUFFICIENT_CREDITS");
                }

                await tx.wallet.update({
                  where: { id: user.wallet.id },
                  data: { creditBalance: { decrement: PROPOSAL_CREDIT_COST } },
                });

                await tx.transaction.create({
                  data: {
                    walletId: user.wallet.id,
                    amount: 0,
                    type: "PAYMENT",
                    description: `Used ${PROPOSAL_CREDIT_COST} Lead Credits for proposal on Job ${jobId}`,
                  },
                });
              }
            }
          }

          try {
            return await tx.proposal.create({
              data: {
                jobId,
                providerId,
                coverLetter,
                price,
                estimatedDays: validatedData.estimatedDays,
                attachments: validatedData.attachments,
              },
              include: {
                job: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
                provider: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            });
          } catch (error) {
            if (
              typeof error === "object" &&
              error !== null &&
              "code" in error &&
              (error as { code?: string }).code === "P2002"
            ) {
              throw new Error("PROPOSAL_ALREADY_EXISTS");
            }
            throw error;
          }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
      break;
    } catch (error) {
      const hasSerializationCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2034";

      if (
        (error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code === "P2034"
          : hasSerializationCode) &&
        attempt < MAX_SERIALIZABLE_RETRIES
      ) {
        continue;
      }
      throw error;
    }
  }

  if (!proposal || !jobClientId) {
    throw new Error("PROPOSAL_SUBMISSION_FAILED");
  }

  if (notifyClient) {
    const effectiveNotificationSender =
      notificationSender ??
      (await import("@/lib/notifications/adminNotifications"))
        .sendComprehensiveNotification;

    void (async () => {
      try {
        const providerName = proposal.provider?.name || "A provider";
        const jobTitle = proposal.job?.title || "your job";

        await effectiveNotificationSender({
          userId: jobClientId,
          title: `New proposal on ${jobTitle}`,
          message: `${providerName} submitted a proposal for ${jobTitle}.`,
          type: "NEW_PROPOSAL",
          emailSubject: `New proposal received: ${jobTitle} - JustInTime`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">You received a new proposal</h2>
              <p>${providerName} has submitted a proposal for your job.</p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">${jobTitle}</h3>
                <p><strong>Proposed Price:</strong> KES ${Number(proposal.price).toLocaleString()}</p>
                <p><strong>Estimated Days:</strong> ${proposal.estimatedDays ?? "Not specified"}</p>
              </div>

              <a href="${process.env.NEXTAUTH_URL}/client/jobs/${proposal.job.id}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review proposal</a>
            </div>
          `,
        });
      } catch (notificationError) {
        console.error("[PROPOSALS_POST_NOTIFICATION]", notificationError);
      }
    })();
  }

  return proposal;
}
