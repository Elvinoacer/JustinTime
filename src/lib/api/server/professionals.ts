import { prisma } from "@/lib/prisma";

export async function getProfessionalById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        subscription: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Error fetching professional:", error);
    return null;
  }
}
