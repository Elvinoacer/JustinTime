import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    // Only admins can waive fees
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: userId } = await params;
    const { waive } = await req.json();

    // Find the user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Update the waiver status
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        onboardingFeeWaived: waive,
        onboardingFeeWaivedBy: waive ? session.user.id : null,
        onboardingFeeWaivedAt: waive ? new Date() : null,
      },
    });

    // Log the admin action
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: waive ? "WAIVED_ONBOARDING_FEE" : "REVOKED_FEE_WAIVER",
        targetId: userId,
        details: {
          userName: profile.user.name,
          userEmail: profile.user.email,
          waivedAt: waive ? new Date().toISOString() : null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      waived: updatedProfile.onboardingFeeWaived,
      message: waive 
        ? "Onboarding fee has been waived" 
        : "Fee waiver has been revoked",
    });
  } catch (error: any) {
    console.error("[WAIVE_FEE_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update waiver status" },
      { status: 500 }
    );
  }
}
