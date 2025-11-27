import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { z } from "zod";

// Schema for profile update
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  hourlyRate: z.number().optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
    fileUrl: z.string(),
  })).optional(),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    field: z.string(),
    startYear: z.string(),
    endYear: z.string().optional(),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Combine user and profile data
    const profileData = {
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      location: user.profile?.location,
      bio: user.profile?.bio,
      skills: user.profile?.skills || [],
      hourlyRate: user.profile?.hourlyRate,
      isVerified: user.profile?.isVerified || false,
      certifications: user.profile?.certifications || [],
      education: user.profile?.education || [],
      memberSince: user.createdAt,
      completedJobs: await prisma.booking.count({
        where: {
          providerId: userId,
          status: "COMPLETED",
        },
      }),
      averageRating: await prisma.review.aggregate({
        where: { targetId: userId },
        _avg: { rating: true },
      }).then(res => res._avg.rating || 0),
      // Placeholder for response time as it requires complex message analysis
      responseTime: "< 2 hours",
    };

    return successResponse(profileData);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    
    const validatedData = updateProfileSchema.parse(body);

    // Update User model for basic info
    const userUpdateData: any = {};
    if (validatedData.name !== undefined) userUpdateData.name = validatedData.name;
    if (validatedData.phone !== undefined) userUpdateData.phone = validatedData.phone;
    if (body.image !== undefined) userUpdateData.image = body.image;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // Upsert Profile model for extended info
    const profileData: any = {};
    if (validatedData.location) profileData.location = validatedData.location;
    if (validatedData.latitude !== undefined) profileData.latitude = validatedData.latitude;
    if (validatedData.longitude !== undefined) profileData.longitude = validatedData.longitude;
    if (validatedData.bio) profileData.bio = validatedData.bio;
    if (validatedData.skills) profileData.skills = validatedData.skills;
    if (validatedData.hourlyRate) profileData.hourlyRate = validatedData.hourlyRate;
    if (validatedData.certifications !== undefined) profileData.certifications = validatedData.certifications;
    if (validatedData.education !== undefined) profileData.education = validatedData.education;

    // If critical fields are updated, reset verification status
    if (validatedData.name || validatedData.location || validatedData.bio || validatedData.certifications) {
      profileData.verificationStatus = "PENDING";
      profileData.isVerified = false;
    }

    const updatedProfile = await prisma.profile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
        verificationStatus: "PENDING",
        isVerified: false,
      },
    });

    return successResponse({ message: "Profile updated successfully" });
  } catch (error) {
    return handleError(error);
  }
}
