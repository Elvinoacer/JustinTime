CREATE TABLE "MessageConversationState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "otherUserId" TEXT NOT NULL,
  "clearedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MessageConversationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageConversationState_userId_otherUserId_key"
  ON "MessageConversationState"("userId", "otherUserId");

CREATE INDEX "MessageConversationState_userId_idx"
  ON "MessageConversationState"("userId");

CREATE INDEX "MessageConversationState_otherUserId_idx"
  ON "MessageConversationState"("otherUserId");

ALTER TABLE "MessageConversationState"
  ADD CONSTRAINT "MessageConversationState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageConversationState"
  ADD CONSTRAINT "MessageConversationState_otherUserId_fkey"
  FOREIGN KEY ("otherUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
