import { auth } from "@/auth";
import { hasClientAccess } from "@/lib/auth/clientAccess";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function ensureClientOwnsJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, clientId: true },
  });

  if (!job) {
    return new NextResponse("Job not found", { status: 404 });
  }

  if (job.clientId !== userId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return null;
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; proposalId: string }>;
  },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!hasClientAccess(session.user)) {
    return NextResponse.json(
      { error: "Client profile required" },
      { status: 403 },
    );
  }

  const { id, proposalId } = await params;
  const ownershipError = await ensureClientOwnsJob(id, session.user.id);
  if (ownershipError) {
    return ownershipError;
  }

  const origin = new URL(request.url).origin;
  const body = await request.text();
  const response = await fetch(
    `${origin}/api/jobs/${id}/proposals/${proposalId}`,
    {
      method: "PATCH",
      headers: {
        cookie: request.headers.get("cookie") || "",
        ...(request.headers.get("content-type")
          ? { "content-type": request.headers.get("content-type") as string }
          : {}),
      },
      body,
      cache: "no-store",
    },
  );

  const payload = await response.text();
  return new NextResponse(payload, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  });
}
