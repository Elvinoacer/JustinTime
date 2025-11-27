import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createJobSchema } from "@/lib/validations/schemas";

// Haversine formula to calculate distance between two coordinates in kilometers
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Simple geocoding cache to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lon: number } | null>();

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache.has(location)) {
    return geocodeCache.get(location)!;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          'User-Agent': 'JustInTime-Job-Platform',
        },
      }
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      geocodeCache.set(location, coords);
      return coords;
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  
  geocodeCache.set(location, null);
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // User location for distance calculation
    const userLat = searchParams.get("userLat") ? parseFloat(searchParams.get("userLat")!) : null;
    const userLon = searchParams.get("userLon") ? parseFloat(searchParams.get("userLon")!) : null;

    // Build where clause
    const where: any = {};
    
    // Status filter
    if (searchParams.get("status")) {
      where.status = searchParams.get("status");
    }
    
    // Category filter
    if (searchParams.get("category")) {
      where.categoryId = searchParams.get("category");
    }
    
    // Location filter (partial match)
    if (searchParams.get("location")) {
      where.location = {
        contains: searchParams.get("location"),
        mode: "insensitive",
      };
    }
    
    // Budget range filter
    if (searchParams.get("budgetMin") || searchParams.get("budgetMax")) {
      where.budget = {};
      if (searchParams.get("budgetMin")) {
        where.budget.gte = parseFloat(searchParams.get("budgetMin")!);
      }
      if (searchParams.get("budgetMax")) {
        where.budget.lte = parseFloat(searchParams.get("budgetMax")!);
      }
    }
    
    // Search filter (title and description)
    if (searchParams.get("search")) {
      const searchTerm = searchParams.get("search")!;
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Verified clients only filter
    if (searchParams.get("verifiedOnly") === "true") {
      where.client = {
        profile: {
          verificationStatus: "VERIFIED",
          isVerified: true,
        },
      };
    }

    // Sorting
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    
    let orderBy: any = { [sortBy]: sortOrder };
    
    // Special case for proposals count sorting
    if (sortBy === "proposals") {
      orderBy = { proposals: { _count: sortOrder } };
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        // For distance sorting, fetch more items initially
        skip: sortBy === "distance" && userLat && userLon ? 0 : skip,
        take: sortBy === "distance" && userLat && userLon ? undefined : pageSize,
        include: {
          client: { select: { id: true, name: true, image: true } },
          category: true,
          _count: { select: { proposals: true } },
        },
        orderBy: sortBy === "distance" ? { createdAt: "desc" } : orderBy,
      }),
      prisma.job.count({ where }),
    ]);

    // Calculate distances and sort if user location provided
    let processedJobs = jobs;
    if (userLat !== null && userLon !== null) {
      // Calculate distance for each job
      const jobsWithDistance = await Promise.all(
        jobs.map(async (job) => {
          let distance = null;
          let jobLat = job.latitude;
          let jobLon = job.longitude;
          
          // Fallback for legacy jobs without stored coordinates
          if ((jobLat === null || jobLon === null) && job.location) {
            try {
              const jobCoords = await geocodeLocation(job.location);
              if (jobCoords) {
                jobLat = jobCoords.lat;
                jobLon = jobCoords.lon;
                
                // Optional: We could update the job in DB here to persist it for next time
                // await prisma.job.update({ where: { id: job.id }, data: { latitude: jobLat, longitude: jobLon } });
              }
            } catch (e) {
              // Ignore geocoding errors for legacy jobs to prevent API failure
            }
          }

          if (jobLat !== null && jobLon !== null) {
            distance = calculateDistance(userLat, userLon, jobLat, jobLon);
          }
          
          return {
            ...job,
            distance: distance !== null ? Math.round(distance * 10) / 10 : null, // Round to 1 decimal
          };
        })
      );

      // Sort by distance if requested
      if (sortBy === "distance") {
        jobsWithDistance.sort((a, b) => {
          // Put jobs without distance at the end
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
        
        // Apply pagination after sorting
        processedJobs = jobsWithDistance.slice(skip, skip + pageSize);
      } else {
        processedJobs = jobsWithDistance.slice(skip, skip + pageSize);
      }
    } else {
      processedJobs = jobs;
    }

    return NextResponse.json({
      items: processedJobs,
      total,
      page,
      pageSize,
      hasMore: skip + processedJobs.length < total,
    });
  } catch (error) {
    console.error("[JOBS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "CLIENT") {
      return new NextResponse("Only clients can post jobs", { status: 403 });
    }


    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    // Look up the category by ID (frontend sends ID)
    const category = await prisma.category.findUnique({
      where: { id: validatedData.category },
    });

    if (!category) {
      return new NextResponse("Invalid category", { status: 400 });
    }
    
    // Geocode location before saving
    let latitude = null;
    let longitude = null;
    if (validatedData.location) {
      try {
        const coords = await geocodeLocation(validatedData.location);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lon;
        }
      } catch (error) {
        console.error("Failed to geocode new job location:", error);
        // Continue without coordinates if geocoding fails
      }
    }
    
    const job = await prisma.job.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        budget: validatedData.budget,
        location: validatedData.location,
        latitude,
        longitude,
        categoryId: category.id,
        clientId: session.user.id,
        images: validatedData.images || [], // Include images
        maxApplicants: validatedData.maxApplicants,
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("[JOBS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
