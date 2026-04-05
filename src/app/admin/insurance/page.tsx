import { prisma } from "@/lib/prisma";
import { ClaimStatus } from "@/generated/prisma/client";
import InsuranceClaimsTable, {
  type AdminInsuranceClaimRow,
} from "@/components/admin/InsuranceClaimsTable";
import { ShieldAlert, CheckCircle2, XCircle, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
}

const ALLOWED_STATUSES = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAID",
] as const;
type InsuranceStatusFilter = (typeof ALLOWED_STATUSES)[number];

export default async function AdminInsurancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const requestedStatus = (params.status || "").toUpperCase();
  const status = ALLOWED_STATUSES.includes(
    requestedStatus as InsuranceStatusFilter,
  )
    ? (requestedStatus as InsuranceStatusFilter)
    : "ALL";

  const where =
    status === "ALL" ? undefined : { status: status as ClaimStatus };

  const [claims, grouped] = await Promise.all([
    prisma.insuranceClaim.findMany({
      where,
      include: {
        claimant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
            date: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.insuranceClaim.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const statusCounts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    PAID: 0,
  };

  for (const row of grouped) {
    if (row.status in statusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row._count;
    }
  }

  const cards = [
    {
      key: "ALL",
      label: "All Claims",
      count: claims.length,
      icon: ShieldAlert,
      style: "text-slate-700 bg-slate-50 border-slate-200",
    },
    {
      key: "PENDING",
      label: "Pending",
      count: statusCounts.PENDING,
      icon: ShieldAlert,
      style: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      key: "APPROVED",
      label: "Approved",
      count: statusCounts.APPROVED,
      icon: CheckCircle2,
      style: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      key: "PAID",
      label: "Paid",
      count: statusCounts.PAID,
      icon: Wallet,
      style: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      key: "REJECTED",
      label: "Rejected",
      count: statusCounts.REJECTED,
      icon: XCircle,
      style: "text-red-700 bg-red-50 border-red-200",
    },
  ];

  const serializedClaims: AdminInsuranceClaimRow[] = claims.map((claim) => ({
    id: claim.id,
    amount: Number(claim.amount || 0),
    approvedAmount:
      claim.approvedAmount != null ? Number(claim.approvedAmount) : null,
    status: claim.status,
    description: claim.description,
    adminNotes: claim.adminNotes,
    evidence: claim.evidence,
    createdAt: claim.createdAt.toISOString(),
    resolvedAt: claim.resolvedAt ? claim.resolvedAt.toISOString() : null,
    claimant: {
      id: claim.claimant.id,
      name: claim.claimant.name,
      email: claim.claimant.email,
    },
    booking: {
      id: claim.booking.id,
      date: claim.booking.date.toISOString(),
      totalAmount: Number(claim.booking.totalAmount || 0),
      status: claim.booking.status,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Insurance Claims
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and resolve Happiness Pledge claims with payout decisions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isActive = status === card.key;
          return (
            <a
              key={card.key}
              href={`?status=${card.key}`}
              className={`rounded-xl border p-3 transition-colors ${card.style} ${isActive ? "ring-2 ring-slate-300" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" />
                <span className="text-xl font-bold">{card.count}</span>
              </div>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide">
                {card.label}
              </p>
            </a>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {ALLOWED_STATUSES.map((item) => (
          <a
            key={item}
            href={`?status=${item}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === item
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {item}
          </a>
        ))}
      </div>

      <InsuranceClaimsTable claims={serializedClaims} />
    </div>
  );
}
