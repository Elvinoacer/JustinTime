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
  
  // Public pages that should be accessible to everyone (authenticated or not)
  const publicPages = [
    "/",
    "/about",
    "/services",
    "/professionals",
    "/booking",
    "/contact",
  ];
  const isPublicPage = publicPages.some(page => 
    nextUrl.pathname === page || nextUrl.pathname.startsWith(page + "/")
  );
  
  // Allow access to public pages without any redirects
  if (isPublicPage) {
    return NextResponse.next();
  }
  
  const hasCompletedOnboarding = req.auth?.user?.onboardingCompleted;
  const userRole = req.auth?.user?.role;
  const emailVerified = req.auth?.user?.emailVerified;

  // Email Verification Check - Block access to protected routes for unverified users
  // Allow access only to auth pages and public pages
  if (isLoggedIn && !emailVerified && !isOnAuth) {
    // Redirect to a "please verify your email" page
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
  if (isLoggedIn && userRole === "ADMIN" && (isOnAnyDashboard || isOnOnboarding)) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  if (isOnAnyDashboard) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    // If logged in but hasn't completed onboarding, redirect to onboarding
    if (!hasCompletedOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    
    // Role-based dashboard access
    // PROVIDER can access both /dashboard and /client
    // CLIENT can only access /client
    if (isOnProviderDashboard && userRole === "CLIENT") {
      // Redirect CLIENT users trying to access provider dashboard to onboarding
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    
    return NextResponse.next();
  }

  if (isOnOnboarding) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }
    
    // Check if this is an upgrade request (CLIENT becoming PROVIDER)
    const isUpgradeRequest = nextUrl.searchParams.get("upgrade") === "true";
    
    // If already completed onboarding, redirect to appropriate dashboard
    // UNLESS this is an upgrade request from a CLIENT user
    if (hasCompletedOnboarding && !(isUpgradeRequest && userRole === "CLIENT")) {
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
      
      // If email is not verified, keep them on auth pages
      if (!emailVerified) {
        return NextResponse.next();
      }
      
      // If logged in and verified, redirect to appropriate dashboard or onboarding
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
