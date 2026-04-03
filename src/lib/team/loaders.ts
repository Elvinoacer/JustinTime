import prisma from "@/lib/prisma";

export async function loadActiveTeamMembers(teamId: string) {
  return prisma.teamMember.findMany({
    where: {
      teamId,
      permissions: { isEmpty: false },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
}

export async function loadTeamAnnouncements(teamId: string, take: number = 5) {
  return prisma.teamAnnouncement.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function loadTeamPayrollHistory(
  teamId: string,
  page: number,
  pageSize: number,
) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), 50)
      : 20;
  const skip = (safePage - 1) * safePageSize;

  const [total, payrolls] = await Promise.all([
    prisma.teamPayroll.count({ where: { teamId } }),
    prisma.teamPayroll.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      skip,
      take: safePageSize,
      include: {
        _count: { select: { earnings: true } },
      },
    }),
  ]);

  return {
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    payrolls,
  };
}
