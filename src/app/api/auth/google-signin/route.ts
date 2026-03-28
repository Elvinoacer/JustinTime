import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Google provisioning is handled by NextAuth callback.",
    },
    { status: 410 },
  );
}
