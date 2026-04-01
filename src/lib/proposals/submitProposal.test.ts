import test from "node:test";
import assert from "node:assert/strict";
import {
  submitProposal,
  type ProposalSubmissionInput,
  type SubmitProposalDbClient,
} from "./submitProposal";

type TxMock = {
  job: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      status: string;
      clientId: string;
      maxApplicants: number | null;
    } | null>;
  };
  proposal: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
    count: (args: unknown) => Promise<number>;
    create: (args: unknown) => Promise<{
      id: string;
      price: number;
      estimatedDays: number;
      job: { id: string; title: string };
      provider: { id: string; name: string; image: string | null };
    }>;
  };
  user: {
    findUnique: (args: unknown) => Promise<{
      subscription: { plan: string; isActive: boolean };
      wallet: { id: string; creditBalance: number };
    } | null>;
  };
  wallet: { update: (args: unknown) => Promise<Record<string, never>> };
  transaction: {
    create: (args: unknown) => Promise<Record<string, never>>;
  };
};

function buildTxMock(overrides: Partial<TxMock> = {}): TxMock {
  const base: TxMock = {
    job: {
      findUnique: async () => ({
        id: "job-1",
        status: "OPEN",
        clientId: "client-1",
        maxApplicants: 5,
      }),
    },
    proposal: {
      findFirst: async () => null,
      count: async () => 0,
      create: async () => ({
        id: "proposal-1",
        price: 1200,
        estimatedDays: 3,
        job: { id: "job-1", title: "Fix sink" },
        provider: { id: "provider-2", name: "Pat", image: null },
      }),
    },
    user: {
      findUnique: async () => ({
        subscription: { plan: "PRO", isActive: true },
        wallet: { id: "wallet-1", creditBalance: 100 },
      }),
    },
    wallet: {
      update: async () => ({}),
    },
    transaction: {
      create: async () => ({}),
    },
  };

  return {
    ...base,
    ...overrides,
    proposal: {
      ...base.proposal,
      ...(overrides.proposal ?? {}),
    },
    job: {
      ...base.job,
      ...(overrides.job ?? {}),
    },
    user: {
      ...base.user,
      ...(overrides.user ?? {}),
    },
    wallet: {
      ...base.wallet,
      ...(overrides.wallet ?? {}),
    },
    transaction: {
      ...base.transaction,
      ...(overrides.transaction ?? {}),
    },
  };
}

function buildDbMock(tx: TxMock, options?: { failOnceSerializable?: boolean }) {
  let attempts = 0;
  return {
    get attempts() {
      return attempts;
    },
    $transaction: async (callback: (ctx: TxMock) => Promise<unknown>) => {
      attempts += 1;
      if (options?.failOnceSerializable && attempts === 1) {
        const err = new Error("serialization conflict") as Error & {
          code?: string;
        };
        err.code = "P2034";
        throw err;
      }
      return callback(tx);
    },
  };
}

const baseInput: ProposalSubmissionInput = {
  jobId: "job-1",
  price: 1200,
  coverLetter:
    "I have handled similar plumbing jobs and can complete this efficiently and safely.",
  estimatedDays: 3,
};

test("rejects self-application in backend", async () => {
  const tx = buildTxMock({
    job: {
      findUnique: async () => ({
        id: "job-1",
        status: "OPEN",
        clientId: "provider-2",
        maxApplicants: 5,
      }),
    },
  });

  const db = buildDbMock(tx);

  await assert.rejects(
    () =>
      submitProposal({
        providerId: "provider-2",
        input: baseInput,
        dbClient: db as unknown as SubmitProposalDbClient,
      }),
    (error: unknown) => {
      assert.equal((error as Error).message, "CANNOT_APPLY_TO_OWN_JOB");
      return true;
    },
  );
});

test("enforces maxApplicants within transaction", async () => {
  const tx = buildTxMock({
    job: {
      findUnique: async () => ({
        id: "job-1",
        status: "OPEN",
        clientId: "client-1",
        maxApplicants: 1,
      }),
    },
    proposal: {
      findFirst: async () => null,
      count: async () => 1,
      create: async () => {
        throw new Error("should not create proposal");
      },
    },
  });

  const db = buildDbMock(tx);

  await assert.rejects(
    () =>
      submitProposal({
        providerId: "provider-2",
        input: baseInput,
        dbClient: db as unknown as SubmitProposalDbClient,
      }),
    (error: unknown) => {
      assert.equal((error as Error).message, "MAX_APPLICANTS_REACHED");
      return true;
    },
  );
});

test("retries transaction on serialization conflict", async () => {
  const tx = buildTxMock();
  const db = buildDbMock(tx, { failOnceSerializable: true });

  const proposal = await submitProposal({
    providerId: "provider-2",
    input: baseInput,
    dbClient: db as unknown as SubmitProposalDbClient,
  });

  assert.equal(proposal.id, "proposal-1");
  assert.equal(db.attempts, 2);
});

test("creates proposal and notifies client when enabled", async () => {
  const tx = buildTxMock();
  const db = buildDbMock(tx);
  const notifications: Array<{
    userId: string;
    title: string;
    message: string;
  }> = [];

  const proposal = await submitProposal({
    providerId: "provider-2",
    input: baseInput,
    dbClient: db as unknown as SubmitProposalDbClient,
    notifyClient: true,
    notificationSender: async (payload) => {
      notifications.push({
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
      });
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(proposal.id, "proposal-1");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.userId, "client-1");
});
