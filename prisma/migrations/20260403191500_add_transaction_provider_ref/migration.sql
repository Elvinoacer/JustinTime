ALTER TABLE "Transaction"
ADD COLUMN "providerRef" TEXT;

CREATE UNIQUE INDEX "Transaction_providerRef_key"
ON "Transaction"("providerRef");
