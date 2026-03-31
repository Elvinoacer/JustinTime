import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasRole } from "@/lib/auth/roles";

const updateTemplateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    coverLetter: z.string().trim().min(50).optional(),
    price: z.number().positive().optional(),
    estimatedDays: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

async function getTemplateForProvider(templateId: string, providerId: string) {
  return prisma.proposalTemplate.findFirst({
    where: {
      id: templateId,
      providerId,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const existing = await getTemplateForProvider(id, session.user.id);

    if (!existing) {
      return new NextResponse("Template not found", { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTemplateSchema.parse(body);

    const template = await prisma.proposalTemplate.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.coverLetter !== undefined
          ? { coverLetter: parsed.coverLetter }
          : {}),
        ...(parsed.price !== undefined ? { price: parsed.price } : {}),
        ...(parsed.estimatedDays !== undefined
          ? { estimatedDays: parsed.estimatedDays }
          : {}),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("[PROPOSAL_TEMPLATE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const existing = await getTemplateForProvider(id, session.user.id);

    if (!existing) {
      return new NextResponse("Template not found", { status: 404 });
    }

    await prisma.proposalTemplate.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PROPOSAL_TEMPLATE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
