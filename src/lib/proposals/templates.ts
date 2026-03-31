export type ProposalTemplateKey = "budget" | "premium" | "fast";

export interface ProposalTemplateResult {
  coverLetter: string;
  price: string;
  estimatedDays: string;
}

function withFallbackBudget(rawBudget: unknown): number {
  const value = Number(rawBudget);
  if (!Number.isFinite(value) || value <= 0) {
    return 1000;
  }
  return value;
}

export function buildProposalTemplate(
  template: ProposalTemplateKey,
  jobTitle: string,
  budgetInput: unknown,
): ProposalTemplateResult {
  const budget = withFallbackBudget(budgetInput);

  if (template === "budget") {
    return {
      coverLetter:
        `Hello! I can complete "${jobTitle}" reliably within the requested scope. ` +
        "I will focus on quality delivery, clear updates, and meeting your timeline while keeping costs efficient.",
      price: String(Math.round(budget * 0.95)),
      estimatedDays: "3",
    };
  }

  if (template === "premium") {
    return {
      coverLetter:
        `Hello! I am a strong fit for "${jobTitle}" and can provide a premium delivery experience. ` +
        "You will receive structured milestones, proactive communication, and high-quality final output.",
      price: String(Math.round(budget * 1.15)),
      estimatedDays: "2",
    };
  }

  return {
    coverLetter:
      `Hello! I can prioritize "${jobTitle}" for fast turnaround. ` +
      "I will provide immediate kickoff, daily progress updates, and quick completion while maintaining quality.",
    price: String(Math.round(budget * 1.05)),
    estimatedDays: "1",
  };
}
