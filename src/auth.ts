import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

type CredentialsUserPayload = {
  role?: string;
  onboardingCompleted?: boolean;
  clientInterests?: string[];
  emailVerified?: Date | string | null;
};

type DbUserSnapshot = {
  id: string;
  role: string;
  onboardingCompleted: boolean;
  clientInterests: string[];
  emailVerified: Date | string | null;
};

const DB_SESSION_SYNC_INTERVAL_SECONDS = 60;

/**
 * Resolve the base URL for internal API calls.
 * Fails loudly if NEXTAUTH_URL is not configured.
 */
function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new Error(
    "[Auth] NEXTAUTH_URL is not set. Add it to .env for development " +
      "or your deployment environment variables.",
  );
}

async function fetchDbUserByEmail(
  email?: string | null,
): Promise<DbUserSnapshot | null> {
  if (!email) return null;

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        role: true,
        onboardingCompleted: true,
        clientInterests: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("[JWT Sync Error]", error);
    return null;
  }
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
          const baseUrl = getBaseUrl();
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
          const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, image: true },
          });

          if (existingUser) {
            await prisma.user.update({
              where: { email: normalizedEmail },
              data: {
                emailVerified: new Date(),
                name: user.name?.trim() || null,
                ...(!existingUser.image && user.image
                  ? { image: user.image.trim() }
                  : {}),
              },
            });
          } else {
            await prisma.user.create({
              data: {
                email: normalizedEmail,
                name: user.name?.trim() || null,
                image: user.image?.trim() || null,
                emailVerified: new Date(),
                role: "CLIENT",
                onboardingCompleted: false,
              },
            });
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

        if (account?.provider === "google") {
          const dbUser = await fetchDbUserByEmail(user.email);
          if (dbUser) {
            token.role = dbUser.role;
            token.id = dbUser.id;
            token.onboardingCompleted = dbUser.onboardingCompleted;
            token.clientInterests = dbUser.clientInterests;
            token.emailVerified = dbUser.emailVerified;
            token.lastDbSyncAt = nowSeconds;
          } else {
            console.error("[JWT Error] Failed to fetch Google user snapshot");
          }
        } else {
          // Credentials login — user data comes from authorize()
          const credentialsUser = user as typeof user & CredentialsUserPayload;
          token.role = credentialsUser.role;
          token.id = user.id;
          token.onboardingCompleted = credentialsUser.onboardingCompleted;
          token.clientInterests = credentialsUser.clientInterests;
          token.emailVerified = credentialsUser.emailVerified;
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
          token.id = latestDbUser.id;
          token.onboardingCompleted = latestDbUser.onboardingCompleted;
          token.clientInterests = latestDbUser.clientInterests;
          token.emailVerified = latestDbUser.emailVerified;
        }
        token.lastDbSyncAt = nowSeconds;
      }

      // Handle session updates (e.g., after onboarding completion)
      if (trigger === "update" && session?.user) {
        token.onboardingCompleted =
          session.user.onboardingCompleted ?? token.onboardingCompleted;
        token.role = session.user.role ?? token.role;
        token.clientInterests =
          session.user.clientInterests ?? token.clientInterests;
        token.emailVerified = session.user.emailVerified ?? token.emailVerified;
        token.authProvider = session.user.authProvider ?? token.authProvider;
        token.lastDbSyncAt = nowSeconds;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
        session.user.clientInterests = token.clientInterests as string[];
        session.user.emailVerified = token.emailVerified as Date | null;
        session.user.authProvider = token.authProvider as string; // B2/B6
      }
      return session;
    },
  },
});
