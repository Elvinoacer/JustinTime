import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile, deleteFile } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export const POST = auth(async (request) => {
  try {
    const session = request.auth;

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        hasPaidOnboardingFee: true,
        onboardingFeeWaived: true,
        verificationStatus: true,
      },
    });

    const hasExpandedStorage = Boolean(
      profile?.hasPaidOnboardingFee ||
      profile?.onboardingFeeWaived ||
      profile?.verificationStatus === "VERIFIED",
    );

    const maxSizeMb = hasExpandedStorage ? 25 : 10;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          error: `File is too large. Your current upload limit is ${maxSizeMb}MB.`,
          maxSizeMb,
          expandedStorage: hasExpandedStorage,
        },
        { status: 413 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    // B2 Fix: Use safe folder prefix
    const allowedFolders = [
      "messages",
      "identity",
      "services",
      "avatars",
      "uploads",
    ];
    const safeFolder = allowedFolders.includes(folder) ? folder : "uploads";
    const fileName = `${safeFolder}/${session.user.id}/${timestamp}-${safeName}`;

    let url;
    url = await uploadFile(buffer, fileName, file.type);

    return NextResponse.json({
      url,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
});

export const DELETE = auth(async (request) => {
  try {
    const session = request.auth;

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (url) {
      await deleteFile(url);
    } else {
      return NextResponse.json({ error: "No url provided" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
});
