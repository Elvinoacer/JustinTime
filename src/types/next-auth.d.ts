import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      roles?: string[];
      onboardingCompleted: boolean;
      providerSetupCompleted?: boolean;
      preferredWorkspace?: string;
      clientInterests: string[];
      emailVerified: Date | null;
      authProvider: string;
      isBanned: boolean;
      deletionScheduledAt: Date | null;
      authInvalidatedAt: Date | null;
      sessionInvalidated?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    roles?: string[];
    onboardingCompleted: boolean;
    providerSetupCompleted?: boolean;
    preferredWorkspace?: string;
    clientInterests: string[];
    emailVerified: Date | null;
    isBanned: boolean;
    deletionScheduledAt: Date | null;
    authInvalidatedAt: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    roles?: string[];
    onboardingCompleted: boolean;
    providerSetupCompleted?: boolean;
    preferredWorkspace?: string;
    clientInterests: string[];
    emailVerified: Date | null;
    authProvider: string;
    lastDbSyncAt?: number;
    isBanned: boolean;
    deletionScheduledAt: Date | null;
    authInvalidatedAt: Date | null;
    authenticatedAt?: number;
    sessionInvalidated?: boolean;
  }
}
