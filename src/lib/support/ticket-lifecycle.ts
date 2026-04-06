import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const EDITABLE_CATEGORIES = [
  "Account",
  "Payments",
  "Technical",
  "Bookings",
  "General",
] as const;

const VALID_RELATED_ENTITY_TYPES = ["BOOKING", "JOB", "INVOICE"] as const;
const SUPPORT_TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;
const SUPPORT_TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];
type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];

type SupportActorRole = "USER" | "ADMIN";

interface SupportTicketRecord {
  id: string;
  userId: string;
  status: string;
  subject: string;
  description: string;
  category: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

interface RelatedEntityReference {
  type: (typeof VALID_RELATED_ENTITY_TYPES)[number];
  id: string;
}

export interface SupportTicketLifecyclePayload {
  action?: string | null;
  status?: string | null;
  priority?: string | null;
  adminNotes?: string | null;
  resolution?: string | null;
  replyMessage?: string | null;
  message?: string | null;
  subject?: string | null;
  description?: string | null;
  category?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface SupportTicketLifecycleInput {
  ticketId: string;
  actorId: string;
  isAdmin: boolean;
  payload: SupportTicketLifecyclePayload;
}

export class SupportTicketLifecycleError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SupportTicketLifecycleError";
    this.status = status;
  }
}

function isSupportTicketStatus(value: string): value is SupportTicketStatus {
  return SUPPORT_TICKET_STATUSES.includes(value as SupportTicketStatus);
}

function isSupportTicketPriority(
  value: string,
): value is SupportTicketPriority {
  return SUPPORT_TICKET_PRIORITIES.includes(value as SupportTicketPriority);
}

function normalizeOptionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return "";
  }

  return String(value).trim();
}

function assertCanMutateEditableTicket(ticket: SupportTicketRecord) {
  if (!["OPEN", "IN_PROGRESS"].includes(ticket.status)) {
    throw new SupportTicketLifecycleError(
      "Only open or in-progress tickets can be edited",
      400,
    );
  }
}

function buildTicketUpdatePlan(
  ticket: SupportTicketRecord,
  isAdmin: boolean,
  payload: SupportTicketLifecyclePayload,
) {
  const action = (payload.action || (isAdmin ? "ADMIN_UPDATE" : "EDIT"))
    .trim()
    .toUpperCase();

  const updateData: Prisma.SupportTicketUpdateInput = {};
  const actorRole: SupportActorRole = isAdmin ? "ADMIN" : "USER";
  let replyMessage: string | null = null;
  let relatedEntityReference: RelatedEntityReference | null = null;

  if (action === "ADD_REPLY") {
    const message =
      normalizeOptionalString(payload.replyMessage) ||
      normalizeOptionalString(payload.message);

    if (!message) {
      throw new SupportTicketLifecycleError("Reply message is required", 400);
    }

    replyMessage = message;

    if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
      updateData.status = "IN_PROGRESS";
      updateData.resolvedAt = null;
    }
  } else if (action === "REOPEN") {
    if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
      throw new SupportTicketLifecycleError(
        "Only resolved or closed tickets can be reopened",
        400,
      );
    }

    updateData.status = "OPEN";
    updateData.resolvedAt = null;
  } else if (action === "CANCEL") {
    if (!["OPEN", "IN_PROGRESS"].includes(ticket.status)) {
      throw new SupportTicketLifecycleError(
        "Only open or in-progress tickets can be cancelled",
        400,
      );
    }

    updateData.status = "CLOSED";
    updateData.resolution =
      normalizeOptionalString(payload.resolution) ||
      (isAdmin ? "Closed by support team" : "Cancelled by requester");
    updateData.resolvedAt = new Date();
  } else if (action === "ACK_RESOLVED") {
    if (ticket.status !== "RESOLVED") {
      throw new SupportTicketLifecycleError(
        "Only resolved tickets can be acknowledged",
        400,
      );
    }

    updateData.status = "CLOSED";
    updateData.resolvedAt = new Date();
  } else if (action === "EDIT") {
    assertCanMutateEditableTicket(ticket);

    const nextSubject = normalizeOptionalString(payload.subject);
    const nextDescription = normalizeOptionalString(payload.description);
    const nextCategory = normalizeOptionalString(payload.category);
    const nextRelatedTypeRaw = normalizeOptionalString(
      payload.relatedEntityType,
    );
    const nextRelatedIdRaw = normalizeOptionalString(payload.relatedEntityId);

    if (nextSubject !== undefined) {
      if (!nextSubject) {
        throw new SupportTicketLifecycleError("Subject cannot be empty", 400);
      }
      updateData.subject = nextSubject;
    }

    if (nextDescription !== undefined) {
      if (!nextDescription) {
        throw new SupportTicketLifecycleError(
          "Description cannot be empty",
          400,
        );
      }
      updateData.description = nextDescription;
    }

    if (nextCategory !== undefined) {
      if (
        !EDITABLE_CATEGORIES.includes(
          nextCategory as (typeof EDITABLE_CATEGORIES)[number],
        )
      ) {
        throw new SupportTicketLifecycleError("Invalid category", 400);
      }
      updateData.category = nextCategory;
    }

    let nextRelatedType: string | null | undefined;
    if (nextRelatedTypeRaw !== undefined) {
      nextRelatedType = nextRelatedTypeRaw
        ? nextRelatedTypeRaw.toUpperCase()
        : null;

      if (
        nextRelatedType &&
        !VALID_RELATED_ENTITY_TYPES.includes(
          nextRelatedType as (typeof VALID_RELATED_ENTITY_TYPES)[number],
        )
      ) {
        throw new SupportTicketLifecycleError(
          "Invalid related entity type",
          400,
        );
      }

      updateData.relatedEntityType = nextRelatedType;
    }

    let nextRelatedId: string | null | undefined;
    if (nextRelatedIdRaw !== undefined) {
      nextRelatedId = nextRelatedIdRaw || null;
      updateData.relatedEntityId = nextRelatedId;
    }

    const resultingCategory =
      nextCategory !== undefined ? nextCategory : ticket.category;
    const resultingRelatedType =
      nextRelatedType !== undefined
        ? nextRelatedType
        : ticket.relatedEntityType;
    const resultingRelatedId =
      nextRelatedId !== undefined ? nextRelatedId : ticket.relatedEntityId;

    if (
      ["Payments", "Bookings"].includes(resultingCategory) &&
      (!resultingRelatedType || !resultingRelatedId)
    ) {
      throw new SupportTicketLifecycleError(
        "Related entity type and ID are required for this ticket category",
        400,
      );
    }

    if (resultingRelatedType && resultingRelatedId) {
      relatedEntityReference = {
        type: resultingRelatedType as (typeof VALID_RELATED_ENTITY_TYPES)[number],
        id: resultingRelatedId,
      };
    }

    if (Object.keys(updateData).length === 0) {
      throw new SupportTicketLifecycleError("No editable fields provided", 400);
    }
  } else if (action === "ADMIN_UPDATE") {
    if (!isAdmin) {
      throw new SupportTicketLifecycleError("Forbidden", 403);
    }

    const nextStatusRaw = normalizeOptionalString(payload.status);
    if (nextStatusRaw) {
      const nextStatus = nextStatusRaw.toUpperCase();
      if (!isSupportTicketStatus(nextStatus)) {
        throw new SupportTicketLifecycleError("Invalid ticket status", 400);
      }

      updateData.status = nextStatus;
      if (["RESOLVED", "CLOSED"].includes(nextStatus)) {
        updateData.resolvedAt = new Date();
      } else {
        updateData.resolvedAt = null;
      }
    }

    const nextPriorityRaw = normalizeOptionalString(payload.priority);
    if (nextPriorityRaw) {
      const nextPriority = nextPriorityRaw.toUpperCase();
      if (!isSupportTicketPriority(nextPriority)) {
        throw new SupportTicketLifecycleError("Invalid ticket priority", 400);
      }
      updateData.priority = nextPriority;
    }

    if (payload.adminNotes !== undefined) {
      const notes = normalizeOptionalString(payload.adminNotes);
      updateData.adminNotes = notes || null;
    }

    if (payload.resolution !== undefined) {
      const resolution = normalizeOptionalString(payload.resolution);
      updateData.resolution = resolution || null;
    }

    const adminReply =
      normalizeOptionalString(payload.replyMessage) ||
      normalizeOptionalString(payload.message);
    if (adminReply) {
      replyMessage = adminReply;
    }

    if (Object.keys(updateData).length === 0 && !replyMessage) {
      throw new SupportTicketLifecycleError("No updates provided", 400);
    }
  } else {
    throw new SupportTicketLifecycleError("Invalid update action", 400);
  }

  return {
    action,
    updateData,
    actorRole,
    replyMessage,
    relatedEntityReference,
  };
}

async function assertRelatedEntityReference(
  relatedEntityReference: RelatedEntityReference,
  actorId: string,
  isAdmin: boolean,
) {
  if (relatedEntityReference.type === "BOOKING") {
    const booking = await prisma.booking.findUnique({
      where: { id: relatedEntityReference.id },
      select: {
        id: true,
        clientId: true,
        providerId: true,
      },
    });

    if (!booking) {
      throw new SupportTicketLifecycleError(
        "Related booking does not exist",
        400,
      );
    }

    if (
      !isAdmin &&
      actorId !== booking.clientId &&
      actorId !== booking.providerId
    ) {
      throw new SupportTicketLifecycleError(
        "You cannot link tickets to another user's booking",
        403,
      );
    }

    return;
  }

  if (relatedEntityReference.type === "JOB") {
    const job = await prisma.job.findUnique({
      where: { id: relatedEntityReference.id },
      select: {
        id: true,
        clientId: true,
      },
    });

    if (!job) {
      throw new SupportTicketLifecycleError("Related job does not exist", 400);
    }

    if (!isAdmin && actorId !== job.clientId) {
      throw new SupportTicketLifecycleError(
        "You cannot link tickets to another user's job",
        403,
      );
    }

    return;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: relatedEntityReference.id },
    select: {
      id: true,
      booking: {
        select: {
          clientId: true,
          providerId: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new SupportTicketLifecycleError(
      "Related invoice does not exist",
      400,
    );
  }

  if (
    !isAdmin &&
    actorId !== invoice.booking.clientId &&
    actorId !== invoice.booking.providerId
  ) {
    throw new SupportTicketLifecycleError(
      "You cannot link tickets to another user's invoice",
      403,
    );
  }
}

export async function applySupportTicketLifecycleUpdate({
  ticketId,
  actorId,
  isAdmin,
  payload,
}: SupportTicketLifecycleInput) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      userId: true,
      status: true,
      subject: true,
      description: true,
      category: true,
      relatedEntityType: true,
      relatedEntityId: true,
    },
  });

  if (!ticket) {
    throw new SupportTicketLifecycleError("Ticket not found", 404);
  }

  const isOwner = ticket.userId === actorId;
  if (!isOwner && !isAdmin) {
    throw new SupportTicketLifecycleError("Forbidden", 403);
  }

  const updatePlan = buildTicketUpdatePlan(ticket, isAdmin, payload);

  if (updatePlan.relatedEntityReference) {
    await assertRelatedEntityReference(
      updatePlan.relatedEntityReference,
      actorId,
      isAdmin,
    );
  }

  const updatedTicket = await prisma.$transaction(async (tx) => {
    const updated =
      Object.keys(updatePlan.updateData).length > 0
        ? await tx.supportTicket.update({
            where: { id: ticketId },
            data: updatePlan.updateData,
          })
        : await tx.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });

    if (updatePlan.replyMessage) {
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          authorId: actorId,
          authorRole: updatePlan.actorRole,
          message: updatePlan.replyMessage,
        },
      });
    }

    if (actorId !== ticket.userId) {
      await tx.notification.create({
        data: {
          userId: ticket.userId,
          type: "SYSTEM",
          title: "Support Ticket Updated",
          message: `Ticket "${updated.subject}" has been updated (${updated.status.replace("_", " ")}).`,
        },
      });
    }

    return tx.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  });

  if (!updatedTicket) {
    throw new SupportTicketLifecycleError("Ticket not found", 404);
  }

  return {
    ticket: updatedTicket,
    action: updatePlan.action,
  };
}
