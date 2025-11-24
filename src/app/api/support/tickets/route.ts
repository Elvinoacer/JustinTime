import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { sendSupportTicketCreatedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { subject, description, category, priority } = body;

    // Validation
    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: "Subject, description, and category are required" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["Account", "Payments", "Technical", "Bookings", "General"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const ticketPriority = priority || "MEDIUM";
    if (!validPriorities.includes(ticketPriority)) {
      return NextResponse.json(
        { error: "Invalid priority" },
        { status: 400 }
      );
    }

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        subject,
        description,
        category,
        priority: ticketPriority,
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

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "SYSTEM",
        title: "Support Ticket Created",
        message: `Your support ticket "${subject}" has been submitted. We'll get back to you soon!`,
      },
    });

    // Send email confirmation
    if (ticket.user.email && ticket.user.name) {
      try {
        await sendSupportTicketCreatedEmail(
          ticket.user.email,
          ticket.user.name,
          ticket.id,
          ticket.subject,
          ticket.category
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
          createdAt: ticket.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating support ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Build where clause
    const where: any = {
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
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
