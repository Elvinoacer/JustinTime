const ESCROW_MARKER_START = "<!--JIT_ESCROW_MILESTONES:";
const ESCROW_MARKER_END = "-->";

export type EscrowMilestoneStatus = "HELD" | "RELEASED";

export interface EscrowMilestone {
  id: string;
  title: string;
  amount: number;
  status: EscrowMilestoneStatus;
  releasedAt?: string;
}

export interface EscrowMilestoneState {
  version: number;
  currency: string;
  totalAmount: number;
  releasedAmount: number;
  milestones: EscrowMilestone[];
  updatedAt: string;
}

export function extractEscrowMilestones(notes?: string | null): {
  plainNotes: string | null;
  escrow: EscrowMilestoneState | null;
} {
  if (!notes) {
    return { plainNotes: null, escrow: null };
  }

  const startIndex = notes.indexOf(ESCROW_MARKER_START);
  if (startIndex === -1) {
    return {
      plainNotes: notes.trim() || null,
      escrow: null,
    };
  }

  const endIndex = notes.indexOf(ESCROW_MARKER_END, startIndex);
  if (endIndex === -1) {
    return {
      plainNotes: notes.trim() || null,
      escrow: null,
    };
  }

  const payload = notes
    .slice(startIndex + ESCROW_MARKER_START.length, endIndex)
    .trim();
  const plainNotes =
    notes
      .slice(0, startIndex)
      .trim()
      .replace(/\n{3,}/g, "\n\n") || null;

  try {
    const parsed = JSON.parse(payload) as EscrowMilestoneState;
    if (!parsed || !Array.isArray(parsed.milestones)) {
      return { plainNotes, escrow: null };
    }
    return { plainNotes, escrow: parsed };
  } catch {
    return { plainNotes, escrow: null };
  }
}

export function upsertEscrowMilestones(
  plainNotes: string | null | undefined,
  escrow: EscrowMilestoneState,
): string {
  const base = (plainNotes || "").trim();
  const encoded = `${ESCROW_MARKER_START}${JSON.stringify(escrow)}${ESCROW_MARKER_END}`;
  return base ? `${base}\n\n${encoded}` : encoded;
}
