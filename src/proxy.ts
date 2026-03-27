import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isOnProviderDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isOnClientDashboard = nextUrl.pathname.startsWith("/client");
  const isOnAdmin = nextUrl.pathname.startsWith("/admin");
  const isOnAnyDashboard = isOnProviderDashboard || isOnClientDashboard;
  const isOnOnboarding = nextUrl.pathname.startsWith("/onboarding");
  const isOnAuth = nextUrl.pathname.startsWith("/auth");
  const isOnProviderPages = nextUrl.pathname.startsWith("/provider");

  // Public pages accessible to everyone
  const publicPages = [
    "/",
    "/about",
    "/services",
    "/professionals",
    "/booking",
    "/contact",
    "/jobs",
    "/faq",
    "/terms",
    "/privacy",
    "/solar",
  ];
  const isPublicPage = publicPages.some(
    (page) =>
      nextUrl.pathname === page || nextUrl.pathname.startsWith(page + "/"),
  );

  if (isPublicPage) {
    return NextResponse.next();
  }

  const hasCompletedOnboarding = req.auth?.user?.onboardingCompleted;
  const userRole = req.auth?.user?.role;
  const emailVerified = req.auth?.user?.emailVerified;
  const authProvider = req.auth?.user?.authProvider;
  const isGoogleUser = authProvider === "google";

  // B2: Email verification — skip for Google users (email is verified by Google)
  if (isLoggedIn && !isGoogleUser && !emailVerified && !isOnAuth) {
    return NextResponse.redirect(new URL("/auth/verify-request", nextUrl));
  }

  // Admin Route Protection
  if (isOnAdmin) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect Admin away from client/provider apps
  if (
    isLoggedIn &&
    userRole === "ADMIN" &&
    (isOnAnyDashboard || isOnOnboarding)
  ) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  // B8: Protect /provider/ routes
  if (isOnProviderPages) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }
    return NextResponse.next();
  }

  if (isOnAnyDashboard) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    if (!hasCompletedOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    // Role-based dashboard access
    if (isOnProviderDashboard && userRole === "CLIENT") {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }

    return NextResponse.next();
  }

  if (isOnOnboarding) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }

    const isUpgradeRequest = nextUrl.searchParams.get("upgrade") === "true";

    if (
      hasCompletedOnboarding &&
      !(isUpgradeRequest && userRole === "CLIENT")
    ) {
      if (userRole === "PROVIDER") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      } else {
        return NextResponse.redirect(new URL("/client/dashboard", nextUrl));
      }
    }
    return NextResponse.next();
  }

  if (isOnAuth) {
    if (isLoggedIn) {
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }

      // Treat completed onboarding as effectively verified for route-guarding.
      // This prevents stale token fields from trapping authenticated users on auth pages.
      const shouldTreatAsVerified =
        isGoogleUser ||
        Boolean(emailVerified) ||
        Boolean(hasCompletedOnboarding);

      // If user is still unverified, keep them on auth pages.
      if (!shouldTreatAsVerified) {
        return NextResponse.next();
      }

      // Verified user — redirect to appropriate destination
      if (!hasCompletedOnboarding) {
        return NextResponse.redirect(new URL("/onboarding", nextUrl));
      }
      if (userRole === "PROVIDER") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      } else {
        return NextResponse.redirect(new URL("/client/dashboard", nextUrl));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
