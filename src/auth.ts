import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 3 * 24 * 60 * 60, // 3 days in seconds (259,200)
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
          // Call internal API route for verification (avoids Prisma in Edge)
          const response = await fetch(
            `${process.env.NEXTAUTH_URL || "https://justintimeservices.vercel.app"}/api/auth/verify-credentials`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                code: credentials.code,
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
    async signIn({ user, account, profile }) {
      // For Google sign-in, create/update user with verified email
      if (account?.provider === "google") {
        // Only run during runtime, not during build
        if (typeof window === 'undefined' && process.env.NEXTAUTH_URL) {
          try {
            // Call API route to handle user creation/update (avoids Prisma in Edge)
            const response = await fetch(
              `${process.env.NEXTAUTH_URL}/api/auth/google-signin`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: user.email,
                  name: user.name,
                  image: user.image,
                }),
              }
            );

            if (!response.ok) {
              console.error("[Google Sign-In API Error]", await response.text());
              return false;
            }
          } catch (error) {
            console.error("[Google Sign-In Error]", error);
            // Don't fail sign-in if API call fails
          }
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      // On initial sign-in, user object is available
      if (user) {
        // For Google sign-in, fetch complete user data from API
        if (account?.provider === "google") {
          // Only run during runtime, not during build
          if (typeof window === 'undefined' && process.env.NEXTAUTH_URL) {
            try {
              // Fetch user data from API (avoids Prisma in Edge)
              const response = await fetch(
                `${process.env.NEXTAUTH_URL}/api/users/me?email=${encodeURIComponent(user.email!)}`,
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
              }
            } catch (error) {
              console.error("[JWT Error - Google]", error);
            }
          }
        } else {
          // For credentials login, user data comes from authorize()
          token.role = (user as any).role;
          token.id = user.id;
          token.onboardingCompleted = (user as any).onboardingCompleted;
          token.clientInterests = (user as any).clientInterests;
          token.emailVerified = (user as any).emailVerified;
        }
      }
      if (trigger === "update" && session?.user) {
        token.onboardingCompleted = session.user.onboardingCompleted;
        token.role = session.user.role;
        token.clientInterests = session.user.clientInterests;
        token.emailVerified = session.user.emailVerified;
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
      }
      return session;
    },
  },
});
