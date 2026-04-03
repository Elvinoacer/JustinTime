import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { hasRole } from "@/lib/auth/roles";
import { Prisma } from "@/generated/prisma/client";

const EDITABLE_CATEGORIES = [
  "Account",
  "Payments",
  "Technical",
  "Bookings",
  "General",
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: {
        id,
      },
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

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Users can only view their own tickets (admins can view all - future feature)
    if (ticket.userId !== session.user.id && !hasRole(session.user, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
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
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const isAdmin = hasRole(session.user, "ADMIN");
    const isOwner = ticket.userId === session.user.id;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const action = String(body.action || "EDIT").toUpperCase();
    const updateData: Prisma.SupportTicketUpdateInput = {};
    const validRelatedTypes = ["BOOKING", "JOB", "INVOICE"];
    let replyMessage: string | null = null;
    let replyAuthorRole: "USER" | "ADMIN" = "USER";

    if (action === "ADD_REPLY") {
      const message = String(body.message || "").trim();
      if (!message) {
        return NextResponse.json(
          { error: "Reply message is required" },
          { status: 400 },
        );
      }

      replyMessage = message;
      replyAuthorRole = isAdmin ? "ADMIN" : "USER";

      if (["RESOLVED", "CLOSED"].includes(ticket.status)) {
        updateData.status = "IN_PROGRESS";
        updateData.resolvedAt = null;
      }
    } else if (action === "REOPEN") {
      if (!["RESOLVED", "CLOSED"].includes(ticket.status)) {
        return NextResponse.json(
          { error: "Only resolved or closed tickets can be reopened" },
          { status: 400 },
        );
      }

      updateData.status = "OPEN";
      updateData.resolvedAt = null;
    } else if (action === "CANCEL") {
      if (!["OPEN", "IN_PROGRESS"].includes(ticket.status)) {
        return NextResponse.json(
          { error: "Only open or in-progress tickets can be cancelled" },
          { status: 400 },
        );
      }

      updateData.status = "CLOSED";
      updateData.resolution =
        String(body.resolution || "Cancelled by requester").trim() ||
        "Cancelled by requester";
      updateData.resolvedAt = new Date();
    } else if (action === "ACK_RESOLVED") {
      if (ticket.status !== "RESOLVED") {
        return NextResponse.json(
          { error: "Only resolved tickets can be acknowledged" },
          { status: 400 },
        );
      }

      updateData.status = "CLOSED";
      updateData.resolvedAt = new Date();
    } else if (action === "EDIT") {
      if (!["OPEN", "IN_PROGRESS"].includes(ticket.status)) {
        return NextResponse.json(
          { error: "Only open or in-progress tickets can be edited" },
          { status: 400 },
        );
      }

      const nextSubject =
        body.subject !== undefined ? String(body.subject).trim() : undefined;
      const nextDescription =
        body.description !== undefined
          ? String(body.description).trim()
          : undefined;
      const nextCategory =
        body.category !== undefined ? String(body.category).trim() : undefined;
      const nextRelatedEntityType =
        body.relatedEntityType !== undefined
          ? String(body.relatedEntityType).trim().toUpperCase()
          : undefined;
      const nextRelatedEntityId =
        body.relatedEntityId !== undefined
          ? String(body.relatedEntityId).trim()
          : undefined;

      if (nextSubject !== undefined) {
        if (!nextSubject) {
          return NextResponse.json(
            { error: "Subject cannot be empty" },
            { status: 400 },
          );
        }
        updateData.subject = nextSubject;
      }

      if (nextDescription !== undefined) {
        if (!nextDescription) {
          return NextResponse.json(
            { error: "Description cannot be empty" },
            { status: 400 },
          );
        }
        updateData.description = nextDescription;
      }

      if (nextCategory !== undefined) {
        if (!EDITABLE_CATEGORIES.includes(nextCategory)) {
          return NextResponse.json(
            { error: "Invalid category" },
            { status: 400 },
          );
        }
        updateData.category = nextCategory;
      }

      if (nextRelatedEntityType !== undefined) {
        if (
          nextRelatedEntityType &&
          !validRelatedTypes.includes(nextRelatedEntityType)
        ) {
          return NextResponse.json(
            { error: "Invalid related entity type" },
            { status: 400 },
          );
        }

        updateData.relatedEntityType = nextRelatedEntityType || null;
      }

      if (nextRelatedEntityId !== undefined) {
        updateData.relatedEntityId = nextRelatedEntityId || null;
      }

      const resultingRelatedType =
        nextRelatedEntityType !== undefined
          ? nextRelatedEntityType || null
          : ticket.relatedEntityType;
      const resultingRelatedId =
        nextRelatedEntityId !== undefined
          ? nextRelatedEntityId || null
          : ticket.relatedEntityId;
      const resultingCategory = nextCategory || ticket.category;

      if (
        ["Payments", "Bookings"].includes(resultingCategory) &&
        (!resultingRelatedType || !resultingRelatedId)
      ) {
        return NextResponse.json(
          {
            error:
              "Related entity type and ID are required for this ticket category",
          },
          { status: 400 },
        );
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: "No editable fields provided" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid update action" },
        { status: 400 },
      );
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated =
        Object.keys(updateData).length > 0
          ? await tx.supportTicket.update({
              where: { id },
              data: updateData,
            })
          : await tx.supportTicket.findUniqueOrThrow({ where: { id } });

      if (replyMessage) {
        await tx.supportTicketMessage.create({
          data: {
            ticketId: id,
            authorId: session.user.id,
            authorRole: replyAuthorRole,
            message: replyMessage,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: ticket.userId,
          type: "SYSTEM",
          title: "Support Ticket Updated",
          message: `Ticket \"${updated.subject}\" has been updated (${updated.status.replace("_", " ")}).`,
        },
      });

      return tx.supportTicket.findUnique({
        where: { id },
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
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
