import { NextRequest, NextResponse } from "next/server";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { getPublicServiceDetail } from "@/lib/api/server/service-detail";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = await getPublicServiceDetail(id);

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return successResponse(service);
  } catch (error) {
    return handleError(error);
  }
}
