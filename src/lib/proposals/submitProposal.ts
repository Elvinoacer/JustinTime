import { z } from "zod";
import prisma from "@/lib/prisma";
import { sendComprehensiveNotification } from "@/lib/notifications/adminNotifications";

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
}

export async function submitProposal({
  providerId,
  input,
  enforceCreditLimit = false,
  notifyClient = false,
}: SubmitProposalOptions) {
  const validatedData = proposalSubmissionSchema.parse(input);
  const jobId = validatedData.jobId;
  const price = validatedData.price ?? validatedData.amount ?? 0;
  const coverLetter =
    validatedData.coverLetter?.trim() ?? validatedData.message?.trim() ?? "";

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, clientId: true, maxApplicants: true },
  });

  if (!job) {
    throw new Error("JOB_NOT_FOUND");
  }

  if (job.status !== "OPEN") {
    throw new Error("JOB_NOT_OPEN");
  }

  if (typeof job.maxApplicants === "number" && job.maxApplicants > 0) {
    const proposalCount = await prisma.proposal.count({ where: { jobId } });
    if (proposalCount >= job.maxApplicants) {
      throw new Error("MAX_APPLICANTS_REACHED");
    }
  }

  const existingProposal = await prisma.proposal.findFirst({
    where: { jobId, providerId },
    select: { id: true },
  });

  if (existingProposal) {
    throw new Error("PROPOSAL_ALREADY_EXISTS");
  }

  const proposal = await prisma.$transaction(async (tx) => {
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

    return tx.proposal.create({
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
  });

  if (notifyClient) {
    void (async () => {
      try {
        const providerName = proposal.provider?.name || "A provider";
        const jobTitle = proposal.job?.title || "your job";

        await sendComprehensiveNotification({
          userId: job.clientId,
          title: `New proposal on ${jobTitle}`,
          message: `${providerName} submitted a proposal for ${jobTitle}.`,
          type: "JOB_ALERT",
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
