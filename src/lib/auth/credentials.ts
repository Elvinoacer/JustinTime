import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth/password";

/**
 * Verify user credentials against database
 * This runs in Node.js context only, not in Edge
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    return null;
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    return null;
  }

  // Return user without password
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image: user.image,
  };
}
