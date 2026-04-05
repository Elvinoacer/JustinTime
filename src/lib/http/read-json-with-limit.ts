export type JsonBodyResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

type ReadJsonOptions = {
  maxBytes?: number;
  requireBody?: boolean;
  expectObject?: boolean;
};

const DEFAULT_MAX_BYTES = 16_384;

export async function readJsonBodyWithLimit<T>(
  request: Request,
  options: ReadJsonOptions = {},
): Promise<JsonBodyResult<T>> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const requireBody = options.requireBody ?? true;
  const expectObject = options.expectObject ?? true;

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const parsedLength = Number(contentLengthHeader);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: "Request payload is too large",
      };
    }
  }

  if (!request.body) {
    return requireBody
      ? {
          ok: false,
          status: 400,
          error: "Request body is required",
        }
      : {
          ok: true,
          data: {} as T,
        };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bodyText = "";
  let bytesRead = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: "Request payload is too large",
      };
    }

    bodyText += decoder.decode(value, { stream: true });
  }

  bodyText += decoder.decode();

  if (!bodyText.trim()) {
    return requireBody
      ? {
          ok: false,
          status: 400,
          error: "Request body is required",
        }
      : {
          ok: true,
          data: {} as T,
        };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Invalid JSON payload",
    };
  }

  if (expectObject && (parsed === null || Array.isArray(parsed))) {
    return {
      ok: false,
      status: 400,
      error: "Invalid request payload",
    };
  }

  return {
    ok: true,
    data: parsed as T,
  };
}
