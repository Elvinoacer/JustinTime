import { Prisma, UserRole } from "@/generated/prisma/client";

export type AdminLogAccessType =
  | "ALL"
  | "PAID"
  | "WAIVED"
  | "VERIFICATION"
  | "FINANCE"
  | "SUPPORT"
  | "USERS"
  | "SETTINGS";

export interface AdminLogFilters {
  search?: string;
  action?: string;
  admin?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BookingFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
}

export interface DisputeFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  creatorRole?: string;
}

export interface SupportTicketFilters {
  status?: string;
  priority?: string;
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
}

export function buildUsersWhere(
  search = "",
  role = "",
  verificationStatus = "",
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role && role !== "ALL") {
    const normalizedRole = role as UserRole;
    where.OR = [
      ...(where.OR || []),
      { role: normalizedRole },
      { roles: { has: normalizedRole } },
    ];
  }

  if (verificationStatus === "BANNED") {
    where.isBanned = true;
  } else if (verificationStatus) {
    where.profile = {
      verificationStatus:
        verificationStatus as Prisma.ProfileWhereInput["verificationStatus"],
    };
  }

  return where;
}

export function buildBookingsWhere(
  filters: BookingFilters,
): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as Prisma.BookingWhereInput["status"];
  }

  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search, mode: "insensitive" } },
      {
        service: { title: { contains: filters.search, mode: "insensitive" } },
      },
      {
        client: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
      {
        provider: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};

    if (filters.dateFrom) {
      dateFilter.gte = new Date(filters.dateFrom);
    }

    if (filters.dateTo) {
      dateFilter.lte = new Date(filters.dateTo);
    }

    where.date = dateFilter;
  }

  if (filters.minAmount || filters.maxAmount) {
    const amountFilter: Prisma.DecimalFilter = {};

    if (filters.minAmount) {
      amountFilter.gte = parseFloat(filters.minAmount);
    }

    if (filters.maxAmount) {
      amountFilter.lte = parseFloat(filters.maxAmount);
    }

    where.totalAmount = amountFilter;
  }

  return where;
}

export function calculateBookingStats(
  statusCounts: Array<{
    status: string;
    _count: number;
    _sum: {
      totalAmount: number | Prisma.Decimal | null;
    };
  }>,
) {
  const stats = {
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    avgBookingValue: 0,
  };

  for (const item of statusCounts) {
    stats.total += item._count;
    stats.totalRevenue += Number(item._sum.totalAmount || 0);

    switch (item.status) {
      case "PENDING":
        stats.pending = item._count;
        break;
      case "CONFIRMED":
      case "IN_PROGRESS":
        stats.confirmed += item._count;
        break;
      case "COMPLETED":
        stats.completed = item._count;
        break;
      case "CANCELLED":
      case "DISPUTED":
        stats.cancelled += item._count;
        break;
    }
  }

  stats.avgBookingValue =
    stats.total > 0 ? Math.round(stats.totalRevenue / stats.total) : 0;

  return stats;
}

export function buildBackgroundCheckWhere(
  status?: string,
): Prisma.BackgroundCheckWhereInput {
  const where: Prisma.BackgroundCheckWhereInput = {};

  if (status && status !== "ALL") {
    where.status = status as Prisma.BackgroundCheckWhereInput["status"];
  }

  return where;
}

export function buildDisputesWhere(
  filters: DisputeFilters,
): Prisma.DisputeWhereInput {
  const where: Prisma.DisputeWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as Prisma.DisputeWhereInput["status"];
  }

  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search, mode: "insensitive" } },
      { reason: { contains: filters.search, mode: "insensitive" } },
      {
        creator: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
      {
        defendant: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
      {
        booking: {
          service: {
            title: { contains: filters.search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAtFilter: Prisma.DateTimeFilter = {};

    if (filters.dateFrom) {
      createdAtFilter.gte = new Date(filters.dateFrom);
    }

    if (filters.dateTo) {
      createdAtFilter.lte = new Date(filters.dateTo);
    }

    where.createdAt = createdAtFilter;
  }

  if (filters.creatorRole && filters.creatorRole !== "ALL") {
    where.creator = {
      role: filters.creatorRole as Prisma.UserWhereInput["role"],
    };
  }

  return where;
}

export function calculateDisputeStats(
  statusCounts: Array<{
    status: string;
    _count: number;
  }>,
  resolvedDisputes: Array<{
    createdAt: Date;
    updatedAt: Date;
  }>,
) {
  const stats = {
    total: 0,
    open: 0,
    resolved: 0,
    closed: 0,
    resolutionRate: 0,
    avgResolutionTime: 0,
  };

  for (const item of statusCounts) {
    stats.total += item._count;

    switch (item.status) {
      case "OPEN":
        stats.open = item._count;
        break;
      case "RESOLVED":
        stats.resolved = item._count;
        break;
      case "CLOSED":
        stats.closed = item._count;
        break;
    }
  }

  const resolvedCount = stats.resolved + stats.closed;
  stats.resolutionRate =
    stats.total > 0 ? Math.round((resolvedCount / stats.total) * 100) : 0;

  if (resolvedDisputes.length > 0) {
    const totalResolutionTime = resolvedDisputes.reduce((sum, dispute) => {
      const created = new Date(dispute.createdAt).getTime();
      const resolved = new Date(dispute.updatedAt).getTime();
      return sum + (resolved - created);
    }, 0);

    const avgTimeMs = totalResolutionTime / resolvedDisputes.length;
    stats.avgResolutionTime = Math.round(avgTimeMs / (1000 * 60 * 60 * 24));
  }

  return stats;
}

export function buildSupportTicketsWhere(
  filters: SupportTicketFilters,
): Prisma.SupportTicketWhereInput {
  const where: Prisma.SupportTicketWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.priority && filters.priority !== "ALL") {
    where.priority = filters.priority;
  }

  if (filters.category && filters.category !== "ALL") {
    where.category = filters.category;
  }

  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search, mode: "insensitive" } },
      { subject: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAtFilter: Prisma.DateTimeFilter = {};

    if (filters.dateFrom) {
      createdAtFilter.gte = new Date(filters.dateFrom);
    }

    if (filters.dateTo) {
      createdAtFilter.lte = new Date(filters.dateTo);
    }

    where.createdAt = createdAtFilter;
  }

  return where;
}

export function calculateSupportTicketStats(
  statusCounts: Array<{
    status: string;
    _count: number;
  }>,
  priorityCounts: Array<{
    priority: string;
    _count: number;
  }>,
  resolvedTickets: Array<{
    createdAt: Date;
    updatedAt: Date;
  }>,
) {
  const stats = {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    urgent: 0,
    avgResponseTime: 0,
  };

  for (const item of statusCounts) {
    stats.total += item._count;

    switch (item.status) {
      case "OPEN":
        stats.open = item._count;
        break;
      case "IN_PROGRESS":
        stats.inProgress = item._count;
        break;
      case "RESOLVED":
      case "CLOSED":
        stats.resolved += item._count;
        break;
    }
  }

  for (const item of priorityCounts) {
    if (item.priority === "URGENT") {
      stats.urgent = item._count;
    }
  }

  if (resolvedTickets.length > 0) {
    const totalResponseTime = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt).getTime();
      const resolved = new Date(ticket.updatedAt).getTime();
      return sum + (resolved - created);
    }, 0);

    const avgTimeMs = totalResponseTime / resolvedTickets.length;
    stats.avgResponseTime = Math.round(avgTimeMs / (1000 * 60 * 60));
  }

  return stats;
}

export function buildTransactionsWhere(
  filters: TransactionFilters,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type as Prisma.TransactionWhereInput["type"];
  }

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as Prisma.TransactionWhereInput["status"];
  }

  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { providerRef: { contains: filters.search, mode: "insensitive" } },
      {
        gatewayReference: { contains: filters.search, mode: "insensitive" },
      },
      { sourceId: { contains: filters.search, mode: "insensitive" } },
      { sourceType: { contains: filters.search, mode: "insensitive" } },
      {
        wallet: {
          user: {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAtFilter: Prisma.DateTimeFilter = {};

    if (filters.dateFrom) {
      createdAtFilter.gte = new Date(filters.dateFrom);
    }

    if (filters.dateTo) {
      createdAtFilter.lte = new Date(filters.dateTo);
    }

    where.createdAt = createdAtFilter;
  }

  if (filters.minAmount || filters.maxAmount) {
    const amountFilter: Prisma.DecimalFilter = {};

    if (filters.minAmount) {
      amountFilter.gte = parseFloat(filters.minAmount);
    }

    if (filters.maxAmount) {
      amountFilter.lte = parseFloat(filters.maxAmount);
    }

    where.amount = amountFilter;
  }

  return where;
}

export function buildWalletsWhere(search: string): Prisma.WalletWhereInput {
  const where: Prisma.WalletWhereInput = {};

  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  return where;
}

export function buildAdminLogsWhere(
  accessType: AdminLogAccessType,
  filters: AdminLogFilters = {},
): Prisma.AdminLogWhereInput {
  const where: Prisma.AdminLogWhereInput = {};

  if (accessType === "PAID") {
    where.action = "ONBOARDING_FEE_PAID_ACCESS_GRANTED";
  } else if (accessType === "WAIVED") {
    where.action = "WAIVED_ONBOARDING_FEE";
  } else if (accessType === "VERIFICATION") {
    where.OR = [
      { action: { contains: "VERIFICATION", mode: "insensitive" } },
      { action: { contains: "IDENTITY", mode: "insensitive" } },
      { action: { contains: "BADGE", mode: "insensitive" } },
      { action: { contains: "TRUST", mode: "insensitive" } },
      { action: { contains: "ONBOARDING_FEE", mode: "insensitive" } },
    ];
  } else if (accessType === "FINANCE") {
    where.OR = [
      { action: { contains: "REFUND", mode: "insensitive" } },
      { action: { contains: "PAYMENT", mode: "insensitive" } },
      { action: { contains: "SETTLEMENT", mode: "insensitive" } },
      { action: { contains: "WALLET", mode: "insensitive" } },
      { action: { contains: "RECONCILIATION", mode: "insensitive" } },
      { action: { contains: "DISPUTE", mode: "insensitive" } },
    ];
  } else if (accessType === "SUPPORT") {
    where.OR = [
      { action: { contains: "SUPPORT", mode: "insensitive" } },
      { action: { contains: "TICKET", mode: "insensitive" } },
    ];
  } else if (accessType === "USERS") {
    where.OR = [
      { action: { contains: "USER", mode: "insensitive" } },
      { action: { contains: "ROLE", mode: "insensitive" } },
      { action: { contains: "BAN", mode: "insensitive" } },
      { action: { contains: "DELETION", mode: "insensitive" } },
      { action: { contains: "PASSWORD", mode: "insensitive" } },
      { action: { contains: "PLAN", mode: "insensitive" } },
    ];
  } else if (accessType === "SETTINGS") {
    where.OR = [
      { action: { contains: "SETTING", mode: "insensitive" } },
      { action: { contains: "CATEGORY", mode: "insensitive" } },
    ];
  }

  if (filters.action?.trim()) {
    where.action = {
      contains: filters.action.trim(),
      mode: "insensitive",
    };
  }

  if (filters.targetId?.trim()) {
    where.targetId = {
      contains: filters.targetId.trim(),
      mode: "insensitive",
    };
  }

  if (filters.admin?.trim()) {
    const adminQuery = filters.admin.trim();
    where.admin = {
      OR: [
        {
          name: {
            contains: adminQuery,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: adminQuery,
            mode: "insensitive",
          },
        },
        {
          id: {
            contains: adminQuery,
            mode: "insensitive",
          },
        },
      ],
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};

    if (filters.dateFrom) {
      createdAt.gte = new Date(filters.dateFrom);
    }

    if (filters.dateTo) {
      createdAt.lte = new Date(filters.dateTo);
    }

    where.createdAt = createdAt;
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      ...(where.OR || []),
      {
        action: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        targetId: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        admin: {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    ];
  }

  return where;
}
