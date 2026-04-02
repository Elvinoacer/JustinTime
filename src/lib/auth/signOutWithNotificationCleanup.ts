import { signOut } from "next-auth/react";
import { revokeClientFcmToken } from "@/lib/notifications/clientToken";

type SignOutOptions = Parameters<typeof signOut>[0];

export async function signOutWithNotificationCleanup(options?: SignOutOptions) {
  try {
    await revokeClientFcmToken();
  } catch {
    // Continue sign out even if token cleanup fails.
  }

  return signOut(options);
}
