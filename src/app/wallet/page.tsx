import { auth } from "@/auth";
import { hasRole } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WalletRouteResolverPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (hasRole(session.user, "PROVIDER")) {
    redirect("/dashboard/wallet");
  }

  redirect("/client/wallet");
}
