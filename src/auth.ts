import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

/**
 * Resolve the base URL for internal API calls.
 * Fails loudly if NEXTAUTH_URL is not configured.
 */
function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  throw new Error(
    "[Auth] NEXTAUTH_URL is not set. Add it to .env for development " +
      "or your deployment environment variables."
  );
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
                code: (credentials as any).code,
              }),
            }
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
        try {
          const baseUrl = getBaseUrl();
          const response = await fetch(`${baseUrl}/api/auth/google-signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              "[Google Sign-In API Error]",
              response.status,
              errorText
            );
            // Log but don't block — user already authenticated with Google.
            // The JWT callback will fetch user data separately and handle
            // missing DB records gracefully.
          }
        } catch (error) {
          console.error("[Google Sign-In Error]", error);
          // Network/fetch errors are common with internal API calls.
          // Don't block sign-in — let the JWT callback handle it.
        }
        return true;
      }
      return true;
    },

    async jwt({ token, user, trigger, session, account }) {
      // On initial sign-in, persist provider + user data
      if (user) {
        // B2/B6: save authProvider on first sign-in
        if (account) {
          token.authProvider = account.provider; // "google" | "credentials"
        }

        if (account?.provider === "google") {
          try {
            const baseUrl = getBaseUrl();
            const response = await fetch(
              `${baseUrl}/api/users/me?email=${encodeURIComponent(user.email!)}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              }
            );

            if (response.ok) {
              const dbUser = await response.json();
              token.role = dbUser.role;
              token.id = dbUser.id;
              token.onboardingCompleted = dbUser.onboardingCompleted;
              token.clientInterests = dbUser.clientInterests;
              token.emailVerified = dbUser.emailVerified;
            } else {
              console.error(
                "[JWT Error] Failed to fetch user:",
                response.status
              );
            }
          } catch (error) {
            console.error("[JWT Error - Google]", error);
          }
        } else {
          // Credentials login — user data comes from authorize()
          token.role = (user as any).role;
          token.id = user.id;
          token.onboardingCompleted = (user as any).onboardingCompleted;
          token.clientInterests = (user as any).clientInterests;
          token.emailVerified = (user as any).emailVerified;
        }
      }

      // Handle session updates (e.g., after onboarding completion)
      if (trigger === "update" && session?.user) {
        token.onboardingCompleted = session.user.onboardingCompleted;
        token.role = session.user.role;
        token.clientInterests = session.user.clientInterests;
        token.emailVerified = session.user.emailVerified;
        if (session.user.authProvider) {
          token.authProvider = session.user.authProvider;
        }
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
