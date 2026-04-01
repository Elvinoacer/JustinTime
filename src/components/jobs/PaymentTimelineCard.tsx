import React from "react";

interface EscrowMilestone {
  id: string;
  status: string;
  amount?: number;
}

interface PaymentTimelineCardProps {
  bookingStatus?: string;
  paymentStatus?: string | null;
  totalAmount?: number | null;
  milestones?: EscrowMilestone[] | null;
}

export default function PaymentTimelineCard({
  bookingStatus,
  paymentStatus,
  totalAmount,
  milestones,
}: PaymentTimelineCardProps) {
  const isAccepted = Boolean(bookingStatus);
  const fundsHeld =
    paymentStatus === "PENDING" || paymentStatus === "COMPLETED";
  const workOngoing =
    bookingStatus === "IN_PROGRESS" || bookingStatus === "COMPLETED";

  const totalMilestones = milestones?.length ?? 0;
  const releasedMilestones =
    milestones?.filter((milestone) => milestone.status === "RELEASED").length ??
    0;

  const paymentReleased =
    paymentStatus === "COMPLETED" ||
    (totalMilestones > 0 && releasedMilestones === totalMilestones);

  const steps = [
    { label: "Accepted", active: isAccepted },
    { label: "Funds Held", active: fundsHeld },
    { label: "Work Ongoing", active: workOngoing },
    { label: "Release Payment", active: paymentReleased },
  ];

  const stepProgress = steps.filter((step) => step.active).length;
  const progressPct = Math.round((stepProgress / steps.length) * 100);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">
        Payment timeline
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.max(8, progressPct)}%` }}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:text-xs">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`rounded-md border px-2 py-1 ${
              step.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            {step.label}
          </div>
        ))}
      </div>

      {totalMilestones > 0 ? (
        <p className="mt-2 text-[11px] sm:text-xs text-slate-600">
          Milestones released: {releasedMilestones}/{totalMilestones}
        </p>
      ) : null}

      {typeof totalAmount === "number" ? (
        <p className="mt-1 text-[11px] sm:text-xs text-slate-600">
          Total amount: KES {totalAmount.toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
