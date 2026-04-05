type PrismaLikeError = {
  code?: string;
  message?: string;
  meta?: {
    column?: string;
    table?: string;
    modelName?: string;
    [key: string]: unknown;
  };
};

const WALLET_SCHEMA_HINTS = [
  "Wallet",
  "WalletTopUp",
  "Transaction",
  "pendingBalance",
  "topUpId",
  "TransactionStatus",
  "TransactionDirection",
  "WalletTransactionCategory",
  "WalletGateway",
];

function hasWalletHint(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  return WALLET_SCHEMA_HINTS.some((hint) => value.includes(hint));
}

export function isWalletSchemaOutOfSyncError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const prismaError = error as PrismaLikeError;

  if (prismaError.code === "P2021" || prismaError.code === "P2022") {
    return true;
  }

  if (prismaError.code === "P2010") {
    if (hasWalletHint(prismaError.message)) {
      return true;
    }

    if (hasWalletHint(prismaError.meta?.table)) {
      return true;
    }

    if (hasWalletHint(prismaError.meta?.column)) {
      return true;
    }
  }

  return (
    hasWalletHint(prismaError.message) &&
    /does not exist|unknown column|relation .* does not exist|enum/i.test(
      prismaError.message || "",
    )
  );
}

export function getWalletSchemaOutOfSyncMessage(): string {
  return "Wallet service is temporarily updating. Please retry in a few minutes.";
}
