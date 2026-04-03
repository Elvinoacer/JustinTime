import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendSupportTicketCreatedEmail } from "@/lib/email";
import { Prisma } from "@/generated/prisma/client";

const USER_PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
const PRIORITY_WEIGHT: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

function getCategoryPriorityCap(category: string): "LOW" | "MEDIUM" | "HIGH" {
  if (category === "Technical" || category === "Payments") return "HIGH";
  return "MEDIUM";
}

function normalizePriority(
  requestedPriority: string | undefined,
  category: string,
): "LOW" | "MEDIUM" | "HIGH" {
  const requested = (requestedPriority || "MEDIUM").toUpperCase();
  const safeRequested = USER_PRIORITY_LEVELS.includes(
    requested as (typeof USER_PRIORITY_LEVELS)[number],
  )
    ? (requested as "LOW" | "MEDIUM" | "HIGH")
    : "MEDIUM";

  const cap = getCategoryPriorityCap(category);
  return PRIORITY_WEIGHT[safeRequested] > PRIORITY_WEIGHT[cap]
    ? cap
    : safeRequested;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      subject,
      description,
      category,
      priority,
      relatedEntityType,
      relatedEntityId,
    } = body;

    // Validation
    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: "Subject, description, and category are required" },
        { status: 400 },
      );
    }

    // Validate category
    const validCategories = [
      "Account",
      "Payments",
      "Technical",
      "Bookings",
      "General",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const validRelatedTypes = ["BOOKING", "JOB", "INVOICE"];
    if (
      relatedEntityType &&
      !validRelatedTypes.includes(String(relatedEntityType).toUpperCase())
    ) {
      return NextResponse.json(
        { error: "Invalid related entity type" },
        { status: 400 },
      );
    }

    if (
      ["Payments", "Bookings"].includes(category) &&
      (!relatedEntityType || !relatedEntityId)
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a related booking, invoice, or job reference for this ticket type",
        },
        { status: 400 },
      );
    }

    const ticketPriority = normalizePriority(priority, category);
    const trimmedDescription = String(description).trim();
    const normalizedRelatedEntityType = relatedEntityType
      ? String(relatedEntityType).toUpperCase()
      : null;
    const normalizedRelatedEntityId = relatedEntityId
      ? String(relatedEntityId).trim()
      : null;

    const ticket = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.supportTicket.create({
        data: {
          userId: session.user.id,
          subject: String(subject).trim(),
          description: trimmedDescription,
          category,
          priority: ticketPriority,
          relatedEntityType: normalizedRelatedEntityType,
          relatedEntityId: normalizedRelatedEntityId,
          messages: {
            create: {
              authorId: session.user.id,
              authorRole: "USER",
              message: trimmedDescription,
            },
          },
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: session.user.id,
          type: "SYSTEM",
          title: "Support Ticket Created",
          message: `Your support ticket "${subject}" has been submitted. We'll get back to you soon!`,
        },
      });

      return createdTicket;
    });

    // Send email confirmation
    if (ticket.user.email && ticket.user.name) {
      try {
        await sendSupportTicketCreatedEmail(
          ticket.user.email,
          ticket.user.name,
          ticket.id,
          ticket.subject,
          ticket.category,
        );
      } catch (emailError) {
        console.error("Failed to send ticket created email:", emailError);
        // Continue even if email fails
      }
    }

    return NextResponse.json(
      {
        message: "Support ticket created successfully",
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          relatedEntityType: ticket.relatedEntityType,
          relatedEntityId: ticket.relatedEntityId,
          createdAt: ticket.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Build where clause
    const where: Prisma.SupportTicketWhereInput = {
      userId: session.user.id,
    };

    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    // Fetch tickets
    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            message: true,
            authorId: true,
            authorRole: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
