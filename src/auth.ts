import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  getDefaultRolesForPrimaryRole,
  normalizeRoles,
} from "@/lib/auth/roles";
import { getAppBaseUrl } from "@/lib/app-url";
import { getAuthUserByEmail } from "@/lib/auth/lifecycle";
import {
  AUTH_CONTEXT_COOKIE_NAME,
  decodeAuthContextCookie,
} from "@/lib/auth/query";

type CredentialsUserPayload = {
  role?: string;
  roles?: string[];
  onboardingCompleted?: boolean;
  clientInterests?: string[];
  emailVerified?: Date | string | null;
  isBanned?: boolean;
  deletionScheduledAt?: Date | string | null;
  authInvalidatedAt?: Date | string | null;
};

type DbUserSnapshot = {
  id: string;
  role: string;
  roles: string[];
  image: string | null;
  onboardingCompleted: boolean;
  providerSetupCompleted: boolean;
  preferredWorkspace: string | null;
  clientInterests: string[];
  emailVerified: Date | string | null;
  isBanned: boolean;
  deletionScheduledAt: Date | string | null;
  authInvalidatedAt: Date | string | null;
};

const DB_SESSION_SYNC_INTERVAL_SECONDS = 0;

async function fetchDbUserByEmail(
  email?: string | null,
): Promise<DbUserSnapshot | null> {
  if (!email) return null;

  try {
    const user = await getAuthUserByEmail(email);

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("[JWT Sync Error]", error);
    return null;
  }
}

function toEpochSeconds(value: unknown): number | null {
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return Math.floor(parsed.getTime() / 1000);
    }
  }

  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 3 * 24 * 60 * 60, // 3 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const code =
          "code" in credentials && typeof credentials.code === "string"
            ? credentials.code
            : undefined;

        try {
          const baseUrl = getAppBaseUrl();
          const response = await fetch(
            `${baseUrl}/api/auth/verify-credentials`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                code,
              }),
            },
          );

          if (!response.ok) {
            return null;
          }

          const user = await response.json();
          return user;
        } catch (error) {
          console.error("[Auth Error]", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in, create/update user with verified email
      if (account?.provider === "google") {
        const normalizedEmail = user.email?.trim().toLowerCase();
        if (!normalizedEmail) {
          return false;
        }

        try {
          const cookieStore = await cookies();
          const authContext = decodeAuthContextCookie(
            cookieStore.get(AUTH_CONTEXT_COOKIE_NAME)?.value,
          );
          const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              image: true,
              role: true,
              roles: true,
              isBanned: true,
              emailVerified: true,
              password: true,
            },
          });

          if (existingUser?.isBanned) {
            return "/auth/error?error=AccountSuspended";
          }

          if (
            existingUser &&
            !existingUser.emailVerified &&
            Boolean(existingUser.password)
          ) {
            return "/auth/error?error=OAuthAccountNotLinked";
          }

          if (existingUser) {
            await prisma.user.update({
              where: { email: normalizedEmail },
              data: {
                emailVerified: new Date(),
                name: user.name?.trim() || null,
                roles: normalizeRoles({
                  role: existingUser.role,
                  roles: existingUser.roles,
                }),
                ...(!existingUser.image && user.image
                  ? { image: user.image.trim() }
                  : {}),
              },
            });
          } else {
            const initialRole =
              authContext?.intent === "provider" ? "PROVIDER" : "CLIENT";
            let referrerId: string | null = null;

            if (authContext?.ref) {
              const referrer = await prisma.user.findUnique({
                where: { referralCode: authContext.ref },
                select: { id: true },
              });

              referrerId = referrer?.id ?? null;
            }

            const createdUser = await prisma.user.create({
              data: {
                email: normalizedEmail,
                name: user.name?.trim() || null,
                image: user.image?.trim() || null,
                emailVerified: new Date(),
                role: initialRole,
                roles: getDefaultRolesForPrimaryRole(initialRole),
                onboardingCompleted: false,
                ...(referrerId ? { referredById: referrerId } : {}),
              },
              select: {
                id: true,
              },
            });

            if (referrerId) {
              await prisma.referral.create({
                data: {
                  referrerId,
                  referredUserId: createdUser.id,
                  type: "SIGNUP",
                  status: "PENDING",
                  points: 100,
                },
              });
            }
          }
        } catch (error) {
          console.error("[Google Sign-In Error]", error);
          return false;
        }
        return true;
      }
      return true;
    },

    async jwt({ token, user, trigger, session, account }) {
      const nowSeconds = Math.floor(Date.now() / 1000);

      // On initial sign-in, persist provider + user data
      if (user) {
        // B2/B6: save authProvider on first sign-in
        if (account) {
          token.authProvider = account.provider; // "google" | "credentials"
        }
        token.authenticatedAt = nowSeconds;
        token.sessionInvalidated = false;

        if (account?.provider === "google") {
          const dbUser = await fetchDbUserByEmail(user.email);
          if (dbUser) {
            token.role = dbUser.role;
            token.roles = normalizeRoles({
              role: dbUser.role,
              roles: dbUser.roles,
            });
            token.id = dbUser.id;
            token.image = dbUser.image ?? user.image ?? token.image;
            token.onboardingCompleted = dbUser.onboardingCompleted;
            token.providerSetupCompleted = dbUser.providerSetupCompleted;
            token.preferredWorkspace = dbUser.preferredWorkspace;
            token.clientInterests = dbUser.clientInterests;
            token.emailVerified = dbUser.emailVerified;
            token.isBanned = dbUser.isBanned;
            token.deletionScheduledAt = dbUser.deletionScheduledAt;
            token.authInvalidatedAt = dbUser.authInvalidatedAt;
            token.lastDbSyncAt = nowSeconds;
          } else {
            console.error("[JWT Error] Failed to fetch Google user snapshot");
          }
        } else {
          // Credentials login — user data comes from authorize()
          const credentialsUser = user as typeof user & CredentialsUserPayload;
          token.role = credentialsUser.role;
          token.roles = normalizeRoles({
            role: credentialsUser.role,
            roles: credentialsUser.roles,
          });
          token.id = user.id;
          token.image = user.image ?? token.image;
          token.onboardingCompleted = credentialsUser.onboardingCompleted;
          token.providerSetupCompleted = credentialsUser.providerSetupCompleted;
          token.preferredWorkspace = credentialsUser.preferredWorkspace;
          token.clientInterests = credentialsUser.clientInterests;
          token.emailVerified = credentialsUser.emailVerified;
          token.isBanned = credentialsUser.isBanned;
          token.deletionScheduledAt = credentialsUser.deletionScheduledAt;
          token.authInvalidatedAt = credentialsUser.authInvalidatedAt;
          token.lastDbSyncAt = nowSeconds;
        }
      }

      const shouldRefreshFromDb =
        !user &&
        trigger !== "update" &&
        !!token.email &&
        (!token.lastDbSyncAt ||
          nowSeconds - Number(token.lastDbSyncAt) >=
            DB_SESSION_SYNC_INTERVAL_SECONDS);

      if (shouldRefreshFromDb) {
        const latestDbUser = await fetchDbUserByEmail(token.email);
        if (latestDbUser) {
          token.role = latestDbUser.role;
          token.roles = normalizeRoles({
            role: latestDbUser.role,
            roles: latestDbUser.roles,
          });
          token.id = latestDbUser.id;
          token.image = latestDbUser.image ?? token.image;
          token.onboardingCompleted = latestDbUser.onboardingCompleted;
          token.providerSetupCompleted = latestDbUser.providerSetupCompleted;
          token.preferredWorkspace = latestDbUser.preferredWorkspace;
          token.clientInterests = latestDbUser.clientInterests;
          token.emailVerified = latestDbUser.emailVerified;
          token.isBanned = latestDbUser.isBanned;
          token.deletionScheduledAt = latestDbUser.deletionScheduledAt;
          token.authInvalidatedAt = latestDbUser.authInvalidatedAt;
          token.lastDbSyncAt = nowSeconds;
        }
      }

      const invalidatedAt = toEpochSeconds(token.authInvalidatedAt);

      token.sessionInvalidated = Boolean(
        invalidatedAt &&
        token.authenticatedAt &&
        invalidatedAt > Number(token.authenticatedAt),
      );

      // Handle session updates (e.g., after onboarding completion)
      if (trigger === "update" && session?.user) {
        token.onboardingCompleted =
          session.user.onboardingCompleted ?? token.onboardingCompleted;
        token.providerSetupCompleted =
          session.user.providerSetupCompleted ?? token.providerSetupCompleted;
        token.preferredWorkspace =
          session.user.preferredWorkspace ?? token.preferredWorkspace;
        token.role = session.user.role ?? token.role;
        token.roles = normalizeRoles({
          role: session.user.role ?? token.role,
          roles: session.user.roles ?? token.roles,
        });
        token.clientInterests =
          session.user.clientInterests ?? token.clientInterests;
        token.emailVerified = session.user.emailVerified ?? token.emailVerified;
        token.authProvider = session.user.authProvider ?? token.authProvider;
        token.image = session.user.image ?? token.image;
        token.isBanned = session.user.isBanned ?? token.isBanned;
        token.deletionScheduledAt =
          session.user.deletionScheduledAt ?? token.deletionScheduledAt;
        token.authInvalidatedAt =
          session.user.authInvalidatedAt ?? token.authInvalidatedAt;
        token.sessionInvalidated =
          session.user.sessionInvalidated ?? token.sessionInvalidated;
        token.lastDbSyncAt = nowSeconds;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.roles = normalizeRoles({
          role: token.role,
          roles: token.roles,
        });
        session.user.id = token.id as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.providerSetupCompleted = Boolean(
          token.providerSetupCompleted,
        );
        session.user.preferredWorkspace =
          (token.preferredWorkspace as string | undefined) ?? "CLIENT";
        session.user.clientInterests = token.clientInterests as string[];
        session.user.emailVerified = token.emailVerified as Date | null;
        session.user.authProvider = token.authProvider as string; // B2/B6
        session.user.isBanned = Boolean(token.isBanned);
        session.user.deletionScheduledAt =
          token.deletionScheduledAt as Date | null;
        session.user.authInvalidatedAt = token.authInvalidatedAt as Date | null;
        session.user.sessionInvalidated = Boolean(token.sessionInvalidated);
        session.user.image =
          (token.image as string | undefined) ?? session.user.image;
      }
      return session;
    },
  },
});
