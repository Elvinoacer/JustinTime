import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STALE_LAG_SECONDS = 120;

export async function POST(request: NextRequest) {
  const expectedToken = process.env.CALL_SWEEP_TOKEN;
  const authHeader = request.headers.get("authorization") || "";

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const ongoingCalls = await prisma.call.findMany({
    where: {
      status: "ONGOING",
      startedAt: { not: null },
      endedAt: null,
    },
    select: {
      id: true,
      startedAt: true,
      duration: true,
    },
  });

  const staleIds: string[] = [];

  for (const call of ongoingCalls) {
    if (!call.startedAt) {
      continue;
    }

    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - call.startedAt.getTime()) / 1000),
    );
    const reportedDuration = call.duration ?? 0;
    const lagSeconds = elapsedSeconds - reportedDuration;

    if (lagSeconds > STALE_LAG_SECONDS) {
      staleIds.push(call.id);
    }
  }

  if (staleIds.length === 0) {
    return NextResponse.json({ success: true, endedCalls: 0 });
  }

  await prisma.call.updateMany({
    where: {
      id: { in: staleIds },
    },
    data: {
      status: "ENDED",
      endedAt: now,
    },
  });

  return NextResponse.json({ success: true, endedCalls: staleIds.length });
}
