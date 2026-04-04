import { NextRequest } from "next/server";
import {
  PUT as updateServiceByQueryParam,
  DELETE as deleteServiceByQueryParam,
} from "../route";

async function createRequestWithServiceId(
  request: NextRequest,
  serviceId: string,
): Promise<NextRequest> {
  const url = new URL(request.url);
  url.searchParams.set("id", serviceId);

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  return new NextRequest(url, {
    method: request.method,
    headers: new Headers(request.headers),
    ...(body !== undefined ? { body } : {}),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxiedRequest = await createRequestWithServiceId(request, id);
  return updateServiceByQueryParam(proxiedRequest);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxiedRequest = await createRequestWithServiceId(request, id);
  return deleteServiceByQueryParam(proxiedRequest);
}
