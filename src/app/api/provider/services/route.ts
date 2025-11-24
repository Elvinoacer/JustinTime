import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleError, successResponse } from "@/lib/middleware/errorHandler";
import { z } from "zod";

// Schema for service creation/update
const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string().min(2),
  isActive: z.boolean().optional(),
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
      category: service.category.name,
      isActive: service.isActive,
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
        pricingUnit: "fixed", // Default value
        isActive: validatedData.isActive ?? true,
      },
    });

    return successResponse({
      id: service.id,
      name: service.title,
      description: service.description,
      price: Number(service.price),
      category: category.name,
      isActive: service.isActive,
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
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

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
      category: updatedService.category.name,
      isActive: updatedService.isActive,
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

    await prisma.service.delete({
      where: { id: serviceId },
    });

    return successResponse({ message: "Service deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}
