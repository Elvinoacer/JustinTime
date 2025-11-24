import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/client");
  const isOnOnboarding = nextUrl.pathname.startsWith("/onboarding");
  const isOnAuth = nextUrl.pathname.startsWith("/auth");
  
  // Check if user has completed onboarding
  const hasCompletedOnboarding = req.auth?.user?.onboardingCompleted;

  if (isOnDashboard) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    // If logged in but hasn't completed onboarding, redirect to onboarding
    if (!hasCompletedOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    return NextResponse.next();
  }

  if (isOnOnboarding) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    // If already completed onboarding, redirect to dashboard
    if (hasCompletedOnboarding) {
      const role = req.auth?.user?.role;
      if (role === "PROVIDER") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      } else {
        return NextResponse.redirect(new URL("/client/dashboard", nextUrl));
      }
    }
    return NextResponse.next();
  }

  if (isOnAuth) {
    if (isLoggedIn) {
      // If logged in, redirect to appropriate dashboard or onboarding
      if (!hasCompletedOnboarding) {
        return NextResponse.redirect(new URL("/onboarding", nextUrl));
      }
      const role = req.auth?.user?.role;
      if (role === "PROVIDER") {
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
