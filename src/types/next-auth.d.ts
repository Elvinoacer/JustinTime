import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      roles?: string[];
      onboardingCompleted: boolean;
      clientInterests: string[];
      emailVerified: Date | null;
      authProvider: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    roles?: string[];
    onboardingCompleted: boolean;
    clientInterests: string[];
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    roles?: string[];
    onboardingCompleted: boolean;
    clientInterests: string[];
    emailVerified: Date | null;
    authProvider: string;
    lastDbSyncAt?: number;
  }
}
