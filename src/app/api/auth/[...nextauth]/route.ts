import { handlers } from "@/auth";

// Export runtime configuration to ensure proper Next.js handling
export const runtime = "nodejs";

// Export individual handlers
export const GET = handlers.GET;
export const POST = handlers.POST;
