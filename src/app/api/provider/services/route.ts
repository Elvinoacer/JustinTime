import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { z } from "zod";
import { deleteFromCloudinary, extractPublicIdFromUrl } from "@/lib/cloudinary";

// Schema for service creation/update
const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  pricingUnit: z.enum(["fixed", "hourly"]).optional(),
  category: z.string().min(2),
  isActive: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
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

    const formattedServices = services.map(service => ({
      id: service.id,
      name: service.title,
      description: service.description,
      price: Number(service.price),
      pricingUnit: service.pricingUnit,
      category: service.category.name,
      isActive: service.isActive,
      images: service.images,
      video: service.video,
    }));

    return successResponse(formattedServices);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Check service limit (max 5)
    const serviceCount = await prisma.service.count({
      where: { providerId: userId },
    });

    if (serviceCount >= 5) {
      return NextResponse.json(
        { error: "You have reached the maximum limit of 5 services." },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const validatedData = serviceSchema.parse(body);

    // Find or create category
    const slug = validatedData.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let category = await prisma.category.findUnique({
      where: { slug },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: validatedData.category,
          slug,
        },
      });
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
        images: validatedData.images || [],
        video: validatedData.video,
      },
    });

    return successResponse({
      id: service.id,
      name: service.title,
      description: service.description,
      price: Number(service.price),
      pricingUnit: service.pricingUnit,
      category: category.name,
      isActive: service.isActive,
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
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("id");

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const body = await request.json();
    
    // Check ownership
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService || existingService.providerId !== userId) {
      return NextResponse.json({ error: "Service not found or unauthorized" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name) updateData.title = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.pricingUnit !== undefined) updateData.pricingUnit = body.pricingUnit;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.video !== undefined) updateData.video = body.video;

    if (body.category) {
      const slug = body.category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let category = await prisma.category.findUnique({
        where: { slug },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: body.category,
            slug,
          },
        });
      }
      updateData.categoryId = category.id;
    }

    // Handle media deletion if images/video changed
    if (body.images) {
      const oldImages = existingService.images;
      const newImages = body.images;
      const imagesToDelete = oldImages.filter(img => !newImages.includes(img));
      
      for (const imgUrl of imagesToDelete) {
        const publicId = extractPublicIdFromUrl(imgUrl);
        if (publicId) await deleteFromCloudinary(publicId);
      }
    }

    if (body.video !== undefined && existingService.video && existingService.video !== body.video) {
      const publicId = extractPublicIdFromUrl(existingService.video);
      if (publicId) await deleteFromCloudinary(publicId);
    }

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: { category: true },
    });

    return successResponse({
      id: updatedService.id,
      name: updatedService.title,
      description: updatedService.description,
      price: Number(updatedService.price),
      pricingUnit: updatedService.pricingUnit,
      category: updatedService.category.name,
      isActive: updatedService.isActive,
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
    
    if (!session || !session.user || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("id");

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    // Check ownership
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!existingService || existingService.providerId !== userId) {
      return NextResponse.json({ error: "Service not found or unauthorized" }, { status: 404 });
    }

    // Delete media from Cloudinary
    for (const imgUrl of existingService.images) {
      const publicId = extractPublicIdFromUrl(imgUrl);
      if (publicId) await deleteFromCloudinary(publicId);
    }

    if (existingService.video) {
      const publicId = extractPublicIdFromUrl(existingService.video);
      if (publicId) await deleteFromCloudinary(publicId);
    }

    await prisma.service.delete({
      where: { id: serviceId },
    });

    return successResponse({ message: "Service deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}
