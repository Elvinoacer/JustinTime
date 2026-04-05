import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { normalizeWorkspace } from "@/lib/auth/workspace";

/**
 * PATCH /api/user/workspace
 *
 * Updates the user's preferred workspace (CLIENT | PROVIDER | ADMIN).
 * Used by the WorkspaceSwitcher component.
 */
export const PATCH = auth(async (req) => {
  try {
    const userId = req.auth?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const workspace = normalizeWorkspace(body?.workspace);

    await prisma.user.update({
      where: { id: userId },
      data: { preferredWorkspace: workspace },
    });

    return NextResponse.json({
      success: true,
      preferredWorkspace: workspace,
    });
  } catch (error) {
    console.error("[WORKSPACE_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update workspace preference" },
      { status: 500 },
    );
  }
});
