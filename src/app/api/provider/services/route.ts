import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { z } from "zod";
import { deleteFile } from "@/lib/s3";
import { hasRole } from "@/lib/auth/roles";
import {
  SERVICE_CANCELLATION_POLICIES,
  SERVICE_LOCATION_TYPES,
  SERVICE_PRICING_UNITS,
  getServiceLimitForPlan,
} from "@/lib/services/config";

// Schema for service creation/update
const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  pricingUnit: z.enum(SERVICE_PRICING_UNITS).optional(),
  category: z.string().min(2),
  isActive: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
  requiresAvailability: z.boolean(),
  defaultDuration: z.number().int().min(15).max(1440),
  locationType: z.enum(SERVICE_LOCATION_TYPES),
  location: z.string().max(160).optional(),
  cancellationPolicy: z.enum(SERVICE_CANCELLATION_POLICIES).optional(),
});

const serviceUpdateSchema = serviceSchema.partial();

async function resolveEffectiveServicePlan(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      isActive: true,
      endDate: true,
    },
  });

  const isExpired = Boolean(
    subscription?.endDate && subscription.endDate < new Date(),
  );

  if (!subscription || !subscription.isActive || isExpired) {
    return "FREE";
  }

  return subscription.plan;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const services = await prisma.service.findMany({
      where: { providerId: userId },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedServices = services.map((service) => ({
      id: service.id,
      title: service.title,
      name: service.title,
      description: service.description,
      price: Number(service.price),
      pricingUnit: service.pricingUnit,
      category: service.category.name,
      categoryId: service.categoryId,
      isActive: service.isActive,
      requiresAvailability: service.requiresAvailability,
      defaultDuration: service.defaultDuration,
      locationType: service.locationType,
      location: service.location,
      cancellationPolicy: service.cancellationPolicy,
      images: service.images,
      video: service.video,
      views: service.views || 0,
      favorites: service.favorites || 0,
    }));

    return successResponse(formattedServices);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const effectivePlan = await resolveEffectiveServicePlan(userId);
    const serviceLimit = getServiceLimitForPlan(effectivePlan);

    // Check service limit for the user's active plan.
    const serviceCount = await prisma.service.count({
      where: { providerId: userId },
    });

    if (Number.isFinite(serviceLimit) && serviceCount >= serviceLimit) {
      return NextResponse.json(
        {
          error: `You have reached the maximum limit of ${serviceLimit} services for your ${effectivePlan} plan.`,
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const validatedData = serviceSchema.parse(body);

    // Accept category id, slug, or name for backward-compatible clients.
    const categoryInput = validatedData.category.trim();
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: categoryInput },
          { slug: { equals: categoryInput, mode: "insensitive" } },
          { name: { equals: categoryInput, mode: "insensitive" } },
        ],
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Invalid category selected." },
        { status: 400 },
      );
    }

    const service = await prisma.service.create({
      data: {
        providerId: userId,
        categoryId: category.id,
        title: validatedData.name,
        description: validatedData.description || "",
        price: validatedData.price,
        pricingUnit: validatedData.pricingUnit || "fixed",
        isActive: validatedData.isActive ?? true,
        requiresAvailability: validatedData.requiresAvailability,
        defaultDuration: validatedData.defaultDuration,
        locationType: validatedData.locationType,
        location: validatedData.location?.trim() || null,
        cancellationPolicy: validatedData.cancellationPolicy ?? "FLEXIBLE",
        images: validatedData.images || [],
        video: validatedData.video,
      },
    });

    return successResponse({
      id: service.id,
      title: service.title,
      name: service.title,
      description: service.description,
      price: Number(service.price),
      pricingUnit: service.pricingUnit,
      category: category.name,
      categoryId: category.id,
      isActive: service.isActive,
      requiresAvailability: service.requiresAvailability,
      defaultDuration: service.defaultDuration,
      locationType: service.locationType,
      location: service.location,
      cancellationPolicy: service.cancellationPolicy,
      images: service.images,
      video: service.video,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("id");

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedData = serviceUpdateSchema.parse(body);

    // Check ownership
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService || existingService.providerId !== userId) {
      return NextResponse.json(
        { error: "Service not found or unauthorized" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.title = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.price !== undefined)
      updateData.price = validatedData.price;
    if (validatedData.pricingUnit !== undefined)
      updateData.pricingUnit = validatedData.pricingUnit;
    if (validatedData.isActive !== undefined)
      updateData.isActive = validatedData.isActive;
    if (validatedData.images !== undefined)
      updateData.images = validatedData.images;
    if (validatedData.video !== undefined)
      updateData.video = validatedData.video;
    if (validatedData.requiresAvailability !== undefined) {
      updateData.requiresAvailability = validatedData.requiresAvailability;
    }
    if (validatedData.defaultDuration !== undefined) {
      updateData.defaultDuration = validatedData.defaultDuration;
    }
    if (validatedData.locationType !== undefined) {
      updateData.locationType = validatedData.locationType;
    }
    if (validatedData.location !== undefined) {
      updateData.location = validatedData.location?.trim() || null;
    }
    if (validatedData.cancellationPolicy !== undefined) {
      updateData.cancellationPolicy = validatedData.cancellationPolicy;
    }

    if (validatedData.category) {
      const categoryInput = validatedData.category.trim();
      const category = await prisma.category.findFirst({
        where: {
          OR: [
            { id: categoryInput },
            { slug: { equals: categoryInput, mode: "insensitive" } },
            { name: { equals: categoryInput, mode: "insensitive" } },
          ],
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Invalid category selected." },
          { status: 400 },
        );
      }
      updateData.categoryId = category.id;
    }

    // Handle media deletion if images/video changed
    if (validatedData.images) {
      const oldImages = existingService.images;
      const newImages = validatedData.images;
      const imagesToDelete = oldImages.filter(
        (img) => !newImages.includes(img),
      );

      for (const imgUrl of imagesToDelete) {
        await deleteFile(imgUrl);
      }
    }

    if (
      validatedData.video !== undefined &&
      existingService.video &&
      existingService.video !== validatedData.video
    ) {
      await deleteFile(existingService.video);
    }

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: { category: true },
    });

    return successResponse({
      id: updatedService.id,
      title: updatedService.title,
      name: updatedService.title,
      description: updatedService.description,
      price: Number(updatedService.price),
      pricingUnit: updatedService.pricingUnit,
      category: updatedService.category.name,
      categoryId: updatedService.categoryId,
      isActive: updatedService.isActive,
      requiresAvailability: updatedService.requiresAvailability,
      defaultDuration: updatedService.defaultDuration,
      locationType: updatedService.locationType,
      location: updatedService.location,
      cancellationPolicy: updatedService.cancellationPolicy,
      images: updatedService.images,
      video: updatedService.video,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !hasRole(session.user, "PROVIDER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("id");

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 },
      );
    }

    // Check ownership
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService || existingService.providerId !== userId) {
      return NextResponse.json(
        { error: "Service not found or unauthorized" },
        { status: 404 },
      );
    }

    const relatedBookingsCount = await prisma.booking.count({
      where: { serviceId },
    });

    if (relatedBookingsCount > 0) {
      await prisma.service.update({
        where: { id: serviceId },
        data: {
          isActive: false,
          promotedUntil: null,
          promotionPlan: null,
        },
      });

      return successResponse({
        message:
          "Service archived because it has existing booking history. It is now inactive in the marketplace.",
        archived: true,
      });
    }

    const mediaToDelete = [
      ...existingService.images,
      ...(existingService.video ? [existingService.video] : []),
    ];

    await prisma.service.delete({
      where: { id: serviceId },
    });

    void Promise.allSettled(mediaToDelete.map((url) => deleteFile(url)));

    return successResponse({ message: "Service deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}
