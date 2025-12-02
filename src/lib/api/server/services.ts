import { prisma } from "@/lib/prisma";

export async function getServiceById(id: string) {
  try {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          include: {
            profile: true,
            subscription: true,
          },
        },
      },
    });

    return service;
  } catch (error) {
    console.error("Error fetching service:", error);
    return null;
  }
}
