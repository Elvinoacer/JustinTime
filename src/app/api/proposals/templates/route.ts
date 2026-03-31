import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasRole } from "@/lib/auth/roles";

const createTemplateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  coverLetter: z.string().trim().min(50),
  price: z.number().positive(),
  estimatedDays: z.number().int().positive().nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasRole(session.user, "PROVIDER")) {
      return new NextResponse("Only providers can manage templates", {
        status: 403,
      });
    }

    const templates = await prisma.proposalTemplate.findMany({
      where: { providerId: session.user.id },
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json({ items: templates });
  } catch (error) {
    console.error("[PROPOSAL_TEMPLATES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!hasRole(session.user, "PROVIDER")) {
      return new NextResponse("Only providers can manage templates", {
        status: 403,
      });
    }

    const body = await request.json();
    const parsed = createTemplateSchema.parse(body);

    const template = await prisma.proposalTemplate.create({
      data: {
        providerId: session.user.id,
        name: parsed.name,
        coverLetter: parsed.coverLetter,
        price: parsed.price,
        estimatedDays: parsed.estimatedDays ?? null,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("[PROPOSAL_TEMPLATES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
