type PrismaLikeError = {
  code?: string;
  meta?: {
    column?: string;
    [key: string]: unknown;
  };
};

export function isPrismaMissingColumnError(
  error: unknown,
  expectedColumn?: string,
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const prismaError = error as PrismaLikeError;
  if (prismaError.code !== "P2022") {
    return false;
  }

  if (!expectedColumn) {
    return true;
  }

  const column = prismaError.meta?.column;
  if (!column || typeof column !== "string") {
    return true;
  }

  return column.includes(expectedColumn);
}

export function getAuthTemporaryUnavailableMessage(): string {
  return "Sign-in is temporarily unavailable. Please try again in a few minutes.";
}
