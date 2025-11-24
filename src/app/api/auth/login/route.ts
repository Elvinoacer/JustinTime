import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/jwt";
import { handleError, successResponse, UnauthorizedError } from "@/lib/middleware/errorHandler";
import { loginSchema } from "@/lib/validations/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user || !user.password || !user.email) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;

    return successResponse({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    return handleError(error);
  }
}
