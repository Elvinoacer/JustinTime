# Pages Documentation

This document provides an overview of all pages in the JustInTime project (files named `page.tsx`).

---

## Public Pages

### 1. Home Page
**Path:** `/`  
**File:** [src/app/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/page.tsx)

**Description:**  
The main landing page of the application. Features a comprehensive overview of the platform with multiple sections.

**Key Components:**
- `Header` - Main navigation header
- `Hero` - Hero section with main call-to-action
- `PopularServices` - Showcase of popular services
- `HowItWorks` - Explanation of the platform workflow
- `FeaturedProfessionals` - Highlighted service providers
- `Benefits` - Platform benefits section
- `Testimonials` - Customer testimonials
- `CTA` - Call-to-action section
- `Footer` - Site footer

---

### 2. Services Listing Page
**Path:** `/services`  
**File:** [src/app/services/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/services/page.tsx)

**Description:**  
Browse and filter available services. Displays a list of all services with filtering capabilities.

**Key Features:**
- Responsive filter panel (toggleable on mobile)
- Service listing grid
- Filter by category, location, price, etc.

**Key Components:**
- `Header` - Main navigation header
- `Filters` - Service filtering sidebar
- `ServicesList` - Grid of available services
- `Footer` - Site footer

---

### 3. Service Details Page
**Path:** `/services/[id]`  
**File:** [src/app/services/[id]/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/services/[id]/page.tsx)

**Description:**  
Detailed view of a specific service provider. Shows comprehensive information about the provider including their profile, services, gallery, reviews, and contact information.

**Key Features:**
- Provider profile with verification badge
- Tabbed interface (About, Services, Gallery, Reviews, Contact)
- Mobile-optimized bottom navigation tabs
- Breadcrumb navigation
- Rating and review system
- Contact buttons (Call, Message)
- Photo gallery
- Pricing information

**Tabs:**
- **About** - Provider bio and pricing information
- **Services** - List of services offered
- **Gallery** - Photo gallery of work
- **Reviews** - Customer reviews and ratings
- **Contact** - Contact information and availability

---

## Authentication Pages

### 4. Login Page
**Path:** `/auth/login`
**File:** [src/app/auth/login/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/login/page.tsx)

**Description:**
Login screen with Email, Phone, and Google Sign-in options.

### 5. Signup Page
**Path:** `/auth/signup`
**File:** [src/app/auth/signup/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/signup/page.tsx)

**Description:**
Sign up screen for new users.

### 6. Forgot Password Page
**Path:** `/auth/forgot-password`
**File:** [src/app/auth/forgot-password/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/forgot-password/page.tsx)

**Description:**
Password reset screen.

### 7. Verification Page
**Path:** `/auth/verify`
**File:** [src/app/auth/verify/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/verify/page.tsx)

**Description:**
Identity verification screen (ID upload, document status).

---

## Service Provider Pages

### 8. Provider Onboarding
**Path:** `/provider/onboarding`
**File:** [src/app/provider/onboarding/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/provider/onboarding/page.tsx)

**Description:**
Welcome / Onboarding screen for service providers.

### 9. Dashboard Home
**Path:** `/dashboard`  
**File:** [src/app/dashboard/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/page.tsx)

**Description:**  
Main dashboard overview for service providers. Shows a summary of active jobs, calendar, earnings, and recent messages.

**Key Components:**
- `ActiveJobs` - Current active job listings
- `Calendar` - Appointment calendar
- `Earnings` - Earnings summary widget
- `ServiceDetails` - Service details widget
- `RecentMessages` - Recent customer messages

**Layout:**  
Two-column responsive grid (2/3 main content, 1/3 sidebar on desktop)

### 10. Bookings Page
**Path:** `/dashboard/bookings`  
**File:** [src/app/dashboard/bookings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/bookings/page.tsx)

**Description:**  
Manage all bookings and appointments. Displays a comprehensive table of all bookings with their status.

**Key Features:**
- Tabular view of all bookings
- Columns: Service, Client, Date, Status
- Status badges (Completed, Pending, etc.)
- Sortable and filterable data

### 11. Earnings Page
**Path:** `/dashboard/earnings`  
**File:** [src/app/dashboard/earnings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/earnings/page.tsx)

**Description:**  
View detailed earnings breakdown and payout history.

**Key Features:**
- Earnings breakdown by service
- Total earnings calculation
- Payout history with dates and amounts
- Two-column layout (Breakdown | Payouts)

### 12. Profile Page
**Path:** `/dashboard/profile`  
**File:** [src/app/dashboard/profile/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/profile/page.tsx)

**Description:**  
Service provider profile management. View and edit provider information.

**Key Features:**
- Profile avatar display
- Personal information (name, email, phone, location)
- Skills showcase with tags
- Profile editing capabilities

### 13. Reviews Page
**Path:** `/dashboard/reviews`  
**File:** [src/app/dashboard/reviews/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/reviews/page.tsx)

**Description:**  
View all customer reviews and ratings received by the service provider.

**Key Features:**
- List of all reviews
- Star rating display (1-5 stars)
- Review details: client name, date, rating, comment
- Chronological ordering

### 14. Services Management Page
**Path:** `/dashboard/services`  
**File:** [src/app/dashboard/services/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/services/page.tsx)

**Description:**  
Manage services offered by the provider. View and edit service listings.

**Key Features:**
- List of all services offered
- Service details: name, category, description, price
- Add/edit/remove services (functionality to be implemented)

### 15. Job Applications
**Path:** `/dashboard/jobs`
**File:** [src/app/dashboard/jobs/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/jobs/page.tsx)

**Description:**
Job Applications / Bids screen.

### 16. Job Requests
**Path:** `/dashboard/requests`
**File:** [src/app/dashboard/requests/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/requests/page.tsx)

**Description:**
Job Requests (Direct Hire) screen.

### 17. Messages
**Path:** `/dashboard/messages`
**File:** [src/app/dashboard/messages/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/messages/page.tsx)

**Description:**
Chat / Messaging screen for providers.

### 18. Notifications
**Path:** `/dashboard/notifications`
**File:** [src/app/dashboard/notifications/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/notifications/page.tsx)

**Description:**
Notifications screen.

### 19. Settings
**Path:** `/dashboard/settings`
**File:** [src/app/dashboard/settings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/settings/page.tsx)

**Description:**
Provider account settings screen.

### 20. Subscription
**Path:** `/dashboard/subscription`
**File:** [src/app/dashboard/subscription/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/subscription/page.tsx)

**Description:**
Subscription / Upgrade screen.

### 21. Support
**Path:** `/dashboard/support`
**File:** [src/app/dashboard/support/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/support/page.tsx)

**Description:**
Support & Dispute screen.

---

## Consumer / Client Pages

### 22. Client Onboarding
**Path:** `/client/onboarding`
**File:** [src/app/client/onboarding/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/onboarding/page.tsx)

**Description:**
Welcome / Onboarding screen for clients.

### 23. Client Dashboard
**Path:** `/client/dashboard`
**File:** [src/app/client/dashboard/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/dashboard/page.tsx)

**Description:**
Job Listing Management screen.

### 24. Post Job
**Path:** `/client/post-job`
**File:** [src/app/client/post-job/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/post-job/page.tsx)

**Description:**
Post a Job screen.

### 25. Job Proposals
**Path:** `/client/proposals`
**File:** [src/app/client/proposals/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/proposals/page.tsx)

**Description:**
Job Proposals screen.

### 26. Client Bookings
**Path:** `/client/bookings`
**File:** [src/app/client/bookings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/bookings/page.tsx)

**Description:**
Direct Booking / Bookings screen.

### 27. Client Messages
**Path:** `/client/messages`
**File:** [src/app/client/messages/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/messages/page.tsx)

**Description:**
Chat / Messaging screen for clients.

### 28. Client Wallet
**Path:** `/client/wallet`
**File:** [src/app/client/wallet/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/wallet/page.tsx)

**Description:**
Wallet & Payment History screen.

### 29. Client Settings
**Path:** `/client/settings`
**File:** [src/app/client/settings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/settings/page.tsx)

**Description:**
Client account settings screen.

### 30. Referral
**Path:** `/client/referral`
**File:** [src/app/client/referral/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/referral/page.tsx)

**Description:**
Referral & Loyalty Program screen.

---

## Admin Pages

### 31. Admin Login
**Path:** `/admin/login`
**File:** [src/app/admin/login/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/login/page.tsx)

**Description:**
Admin Login screen.

### 32. Admin Dashboard
**Path:** `/admin/dashboard`
**File:** [src/app/admin/dashboard/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/dashboard/page.tsx)

**Description:**
Admin Dashboard / Analytics screen.

### 33. User Management
**Path:** `/admin/users`
**File:** [src/app/admin/users/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/users/page.tsx)

**Description:**
User Management screen.

---

## Page Categories Summary

### Public Pages (3)
1. Home (`/`)
2. Services Listing (`/services`)
3. Service Details (`/services/[id]`)

### Authentication Pages (4)
1. Login (`/auth/login`)
2. Signup (`/auth/signup`)
3. Forgot Password (`/auth/forgot-password`)
4. Verification (`/auth/verify`)

### Service Provider Pages (14)
1. Onboarding (`/provider/onboarding`)
2. Dashboard Home (`/dashboard`)
3. Bookings (`/dashboard/bookings`)
4. Earnings (`/dashboard/earnings`)
5. Profile (`/dashboard/profile`)
6. Reviews (`/dashboard/reviews`)
7. Services Management (`/dashboard/services`)
8. Job Applications (`/dashboard/jobs`)
9. Job Requests (`/dashboard/requests`)
10. Messages (`/dashboard/messages`)
11. Notifications (`/dashboard/notifications`)
12. Settings (`/dashboard/settings`)
13. Subscription (`/dashboard/subscription`)
14. Support (`/dashboard/support`)

### Consumer / Client Pages (9)
1. Onboarding (`/client/onboarding`)
2. Dashboard (`/client/dashboard`)
3. Post Job (`/client/post-job`)
4. Proposals (`/client/proposals`)
5. Bookings (`/client/bookings`)
6. Messages (`/client/messages`)
7. Wallet (`/client/wallet`)
8. Settings (`/client/settings`)
9. Referral (`/client/referral`)

### Admin Pages (3)
1. Login (`/admin/login`)
2. Dashboard (`/admin/dashboard`)
3. User Management (`/admin/users`)

---

## Total Pages: 33

**Last Updated:** 2025-11-24
