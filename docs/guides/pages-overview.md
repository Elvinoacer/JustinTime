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

---

### 3. Service Details Page

**Path:** `/services/[id]`  
**File:** [src/app/services/[id]/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/services/[id]/page.tsx)

**Description:**  
Detailed view of a specific service provider with comprehensive information.

**Key Features:**

- Provider profile with verification badge
- Tabbed interface (About, Services, Gallery, Reviews, Contact)
- Mobile-optimized bottom navigation tabs
- Rating and review system
- Contact buttons (Call, Message)
- Photo gallery
- Pricing information

---

### 4. Professionals Listing Page

**Path:** `/professionals`  
**File:** [src/app/professionals/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/professionals/page.tsx)

**Description:**  
Browse and filter service professionals. Alternative view focusing on providers rather than services.

**Key Features:**

- Grid view of professionals
- Filter by skills, location, rating
- Search functionality
- Professional cards with ratings and verification badges

---

### 5. Professional Details Page

**Path:** `/professionals/[id]`  
**File:** [src/app/professionals/[id]/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/professionals/[id]/page.tsx)

**Description:**  
Detailed professional profile page with comprehensive provider information.

**Key Features:**

- Professional bio and verification status
- Services offered with pricing
- Portfolio/gallery
- Reviews and ratings
- Contact and booking options
- Share profile functionality
- WhatsApp integration

---

### 6. Jobs Listing Page

**Path:** `/jobs`  
**File:** [src/app/jobs/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/jobs/page.tsx)

**Description:**  
Public job listings page where users can browse available job postings.

**Key Features:**

- Job cards with client info and budget
- Real-time data from API
- Filter and search functionality
- Category-based filtering
- Job details preview

---

### 7. Job Details Page

**Path:** `/jobs/[id]`  
**File:** [src/app/jobs/[id]/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/jobs/[id]/page.tsx)

**Description:**  
Detailed view of a specific job posting with full description and requirements.

---

### 8. Booking/Checkout Page

**Path:** `/booking`  
**File:** [src/app/booking/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/booking/page.tsx)

**Description:**  
Main booking and checkout page for services. Handles service booking flow with availability checking, negotiation, and booking confirmation.

**Key Features:**

- Service and provider information display
- Date and time slot selection
- Real-time availability checking
- Location preference selection
- Price negotiation dialog
- Booking confirmation

---

### 9. Blog Page

**Path:** `/blog`  
**File:** [src/app/blog/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/blog/page.tsx)

**Description:**  
Blog listing page showcasing articles, tips, and platform updates.

**Key Features:**

- Blog post cards with images
- Category filtering
- Search functionality
- Author information
- Read time estimates
- Featured posts section

---

### 10. About Page

**Path:** `/about`  
**File:** [src/app/about/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/about/page.tsx)

**Description:**  
About page providing information about the platform, mission, and team.

---

### 11. Contact Page

**Path:** `/contact`  
**File:** [src/app/contact/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/contact/page.tsx)

**Description:**  
Contact page with contact form and support information.

---

### 12. FAQ Page

**Path:** `/faq`  
**File:** [src/app/faq/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/faq/page.tsx)

**Description:**  
Frequently Asked Questions page with searchable Q&A accordion.

---

### 13. Privacy Policy

**Path:** `/privacy`  
**File:** [src/app/privacy/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/privacy/page.tsx)

**Description:**  
Privacy policy page detailing data collection and usage policies.

---

### 14. Terms of Service

**Path:** `/terms`  
**File:** [src/app/terms/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/terms/page.tsx)

**Description:**  
Terms of service page outlining platform usage terms and conditions.

---

### 15. Cookie Policy

**Path:** `/cookie-policy`  
**File:** [src/app/cookie-policy/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/cookie-policy/page.tsx)

**Description:**  
Cookie policy page explaining cookie usage and user consent.

---

## Authentication Pages

### 16. Login Page

**Path:** `/auth/login`  
**File:** [src/app/auth/login/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/login/page.tsx)

**Description:**  
Login screen with Email, Phone, and Google Sign-in options.

---

### 17. Signup Page

**Path:** `/auth/signup`  
**File:** [src/app/auth/signup/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/signup/page.tsx)

**Description:**  
Sign up screen for new users.

---

### 18. Forgot Password Page

**Path:** `/auth/forgot-password`  
**File:** [src/app/auth/forgot-password/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/forgot-password/page.tsx)

**Description:**  
Password reset request screen.

---

### 19. Verification Page

**Path:** `/auth/verify`  
**File:** [src/app/auth/verify/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/verify/page.tsx)

**Description:**  
Identity verification screen (ID upload, document status).

---

### 20. Verify Request Page

**Path:** `/auth/verify-request`
**File:** [src/app/auth/verify-request/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/verify-request/page.tsx)

**Description:**
"Check your email" screen displayed after signup, instructing the user to verify their email address.

---

### 21. Verify Email Page

**Path:** `/auth/verify-email`
**File:** [src/app/auth/verify-email/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/verify-email/page.tsx)

**Description:**
Handles the email verification process using a token from the URL. Displays success or error status.

---

### 22. Reset Password Page

**Path:** `/auth/reset-password`
**File:** [src/app/auth/reset-password/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/auth/reset-password/page.tsx)

**Description:**
Form for users to enter a new password after clicking a password reset link.

---

## Onboarding

### 23. Unified Onboarding

**Path:** `/onboarding`  
**File:** [src/app/onboarding/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/onboarding/page.tsx)

**Description:**  
Unified onboarding flow for both clients and providers. Multi-step process for collecting user information and preferences.

**Key Features:**

- Role selection (Client vs Provider)
- Client: Interest/category selection
- Provider: Skills, location, bio collection
- Provider: Identity verification with face detection
- Avatar upload with image cropper
- Profile completion tracking
- Conditional redirect based on role

---

### 24. Provider Onboarding

**Path:** `/provider/onboarding`  
**File:** [src/app/provider/onboarding/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/provider/onboarding/page.tsx)

**Description:**  
Provider-specific onboarding flow for service professional registration.

---

### 25. Client Onboarding

**Path:** `/client/onboarding`  
**File:** [src/app/client/onboarding/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/onboarding/page.tsx)

**Description:**  
Client-specific onboarding flow for service consumer registration.

---

## Service Provider Pages

### 26. Provider Dashboard Home

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

---

### 27. Provider Analytics

**Path:** `/dashboard/analytics`  
**File:** [src/app/dashboard/analytics/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/analytics/page.tsx)

**Description:**  
Provider analytics dashboard with performance metrics and insights.

**Key Features:**

- Basic analytics (all users)
- Advanced analytics (Pro/Business tier only)
- Earnings breakdown
- Booking statistics
- Customer retention metrics
- Revenue growth charts
- Service performance analysis
- Upgrade prompt for free users

---

### 28. Availability Management

**Path:** `/dashboard/availability`  
**File:** [src/app/dashboard/availability/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/availability/page.tsx)

**Description:**  
Manage provider availability schedule and time slots.

**Key Features:**

- Weekly recurring schedule management
- Date-specific exceptions
- Time slot configuration
- Available/unavailable marking

---

### 29. Provider Bookings

**Path:** `/dashboard/bookings`  
**File:** [src/app/dashboard/bookings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/bookings/page.tsx)

**Description:**  
Manage all bookings and appointments with comprehensive table view.

**Key Features:**

- Tabular view of all bookings
- Columns: Service, Client, Date, Status
- Status badges (Completed, Pending, etc.)
- Sortable and filterable data

---

### 30. Earnings Page

**Path:** `/dashboard/earnings`  
**File:** [src/app/dashboard/earnings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/earnings/page.tsx)

**Description:**  
View detailed earnings breakdown and payout history.

**Key Features:**

- Earnings breakdown by service
- Total earnings calculation
- Payout history with dates and amounts
- Two-column layout (Breakdown | Payouts)

---

### 31. Provider Profile

**Path:** `/dashboard/profile`  
**File:** [src/app/dashboard/profile/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/profile/page.tsx)

**Description:**  
Service provider profile management. View and edit provider information.

**Key Features:**

- Profile avatar display
- Personal information (name, email, phone, location)
- Skills showcase with tags
- Profile editing capabilities

---

### 32. Provider Reviews

**Path:** `/dashboard/reviews`  
**File:** [src/app/dashboard/reviews/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/reviews/page.tsx)

**Description:**  
View all customer reviews and ratings received by the service provider.

**Key Features:**

- List of all reviews
- Star rating display (1-5 stars)
- Review details: client name, date, rating, comment
- Chronological ordering

---

### 33. Services Management

**Path:** `/dashboard/services`  
**File:** [src/app/dashboard/services/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/services/page.tsx)

**Description:**  
Manage services offered by the provider. View and edit service listings.

**Key Features:**

- List of all services offered
- Service details: name, category, description, price
- Add/edit/remove services

---

### 34. Provider Job Applications

**Path:** `/dashboard/jobs`  
**File:** [src/app/dashboard/jobs/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/jobs/page.tsx)

**Description:**  
Provider jobs management with real database integration.

**Key Features:**

- Tab navigation (Available, Applied, Active, Completed)
- Job cards with client info and budget
- Submit proposal modal with cover letter and bid
- Job details modal
- Withdraw pending proposals
- Real-time data from API

---

### 35. Job Requests

**Path:** `/dashboard/requests`  
**File:** [src/app/dashboard/requests/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/requests/page.tsx)

**Description:**  
Job Requests (Direct Hire) management screen.

---

### 36. Provider Messages

**Path:** `/dashboard/messages`  
**File:** [src/app/dashboard/messages/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/messages/page.tsx)

**Description:**  
Real-time chat and messaging interface for providers with comprehensive features.

**Key Features:**

- Real-time socket-based messaging
- Online/offline status indicators
- Message status (sent/delivered/read) with visual ticks
- Image and file attachments (Cloudinary for media, Vercel Blob for documents)
- 1MB file upload limit
- Typing indicators
- Message deletion
- Conversation clearing
- File preview with icons for different file types
- Optimistic UI updates

---

### 37. Provider Notifications

**Path:** `/dashboard/notifications`  
**File:** [src/app/dashboard/notifications/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/notifications/page.tsx)

**Description:**  
Notifications screen for providers.

---

### 38. Provider Settings

**Path:** `/dashboard/settings`  
**File:** [src/app/dashboard/settings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/settings/page.tsx)

**Description:**  
Provider account settings screen.

---

### 39. Premium/Upgrade Page

**Path:** `/dashboard/premium`  
**File:** [src/app/dashboard/premium/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/premium/page.tsx)

**Description:**  
Premium features and subscription upgrade options.

---

### 40. Help Center

**Path:** `/dashboard/help`  
**File:** [src/app/dashboard/help/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/dashboard/help/page.tsx)

**Description:**  
Help center and FAQ for providers.

---

## Consumer / Client Pages

### 41. Client Dashboard

**Path:** `/client/dashboard`  
**File:** [src/app/client/dashboard/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/dashboard/page.tsx)

**Description:**  
Job Listing Management screen for clients.

---

### 42. Client Analytics

**Path:** `/client/analytics`  
**File:** [src/app/client/analytics/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/analytics/page.tsx)

**Description:**  
Client analytics dashboard with comprehensive metrics and visualizations.

**Key Features:**

- Time range selection (7d, 30d, 90d, 1y)
- Interactive charts (Line, Area, Bar, Pie)
- Metrics: Total Jobs, Active Jobs, Completed Jobs, Total Spent
- Job completion trends
- Spending analysis
- Job category distribution
- Provider performance ratings
- Budget utilization charts

---

### 43. Post Job

**Path:** `/client/post-job`  
**File:** [src/app/client/post-job/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/post-job/page.tsx)

**Description:**  
Post a job screen for clients.

---

### 44. Client Job Details

**Path:** `/client/jobs/[id]`  
**File:** [src/app/client/jobs/[id]/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/jobs/[id]/page.tsx)

**Description:**  
View and manage specific job details and proposals.

---

### 45. Job Proposals

**Path:** `/client/proposals`  
**File:** [src/app/client/proposals/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/proposals/page.tsx)

**Description:**  
Job Proposals management screen.

---

### 46. Client Bookings

**Path:** `/client/bookings`  
**File:** [src/app/client/bookings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/bookings/page.tsx)

**Description:**  
Direct Booking and bookings management screen.

---

### 47. Client Messages

**Path:** `/client/messages`  
**File:** [src/app/client/messages/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/messages/page.tsx)

**Description:**  
Chat and messaging screen for clients.

---

### 48. Client Profile

**Path:** `/client/profile`  
**File:** [src/app/client/profile/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/profile/page.tsx)

**Description:**  
Client profile management and preferences.

---

### 49. Client Wallet

**Path:** `/client/wallet`  
**File:** [src/app/client/wallet/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/wallet/page.tsx)

**Description:**  
Wallet and payment history screen.

---

### 50. Client Notifications

**Path:** `/client/notifications`  
**File:** [src/app/client/notifications/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/notifications/page.tsx)

**Description:**  
Notifications screen for clients.

---

### 51. Client Settings

**Path:** `/client/settings`  
**File:** [src/app/client/settings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/settings/page.tsx)

**Description:**  
Client account settings screen.

---

### 52. Referral Program

**Path:** `/client/referral`  
**File:** [src/app/client/referral/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/referral/page.tsx)

**Description:**  
Referral and loyalty program screen.

---

### 53. Submit Review

**Path:** `/client/reviews/submit/[bookingId]`  
**File:** [src/app/client/reviews/submit/[bookingId]/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/client/reviews/submit/[bookingId]/page.tsx)

**Description:**  
Submit review page for completed bookings.

**Key Features:**

- Star rating selection
- Review text input
- Provider information display
- Booking details reference

---

## Admin Pages

### 54. Admin Login

**Path:** `/admin/login`  
**File:** [src/app/admin/login/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/login/page.tsx)

**Description:**  
Admin Login screen.

---

### 55. Admin Dashboard (Main)

**Path:** `/admin`  
**File:** [src/app/admin/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/page.tsx)

**Description:**  
Main Admin Dashboard with platform analytics, key stats, and quick actions. Fetches real-time data from the database.

---

### 56. Admin Dashboard (Analytics)

**Path:** `/admin/dashboard`  
**File:** [src/app/admin/dashboard/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/dashboard/page.tsx)

**Description:**  
Visual analytics dashboard with charts and graphs. Currently serves as a UI representation of platform metrics.

---

### 57. User Management

**Path:** `/admin/users`  
**File:** [src/app/admin/users/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/users/page.tsx)

**Description:**  
User Management screen for admins.

---

### 58. Admin Disputes

**Path:** `/admin/disputes`
**File:** [src/app/admin/disputes/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/disputes/page.tsx)

**Description:**
Manage platform disputes between clients and providers.

---

### 59. Admin Bookings

**Path:** `/admin/bookings`
**File:** [src/app/admin/bookings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/bookings/page.tsx)

**Description:**
Comprehensive view of all platform bookings with filtering and management options.

---

### 60. Admin Verifications

**Path:** `/admin/verifications`
**File:** [src/app/admin/verifications/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/verifications/page.tsx)

**Description:**
Review and manage provider verification requests (identity, documents).

---

### 61. Admin Finance

**Path:** `/admin/finance`
**File:** [src/app/admin/finance/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/finance/page.tsx)

**Description:**
Financial overview, transaction history, and wallet management.

---

### 62. Admin Support

**Path:** `/admin/support`
**File:** [src/app/admin/support/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/support/page.tsx)

**Description:**
Support ticket management system.

---

### 63. Admin Settings

**Path:** `/admin/settings`
**File:** [src/app/admin/settings/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/settings/page.tsx)

**Description:**
System-wide settings and configuration (e.g., categories).

---

### 64. User Details

**Path:** `/admin/users/[id]`
**File:** [src/app/admin/users/[id]/page.tsx](file:///home/elvin/Projects/SAAS/JAVASCRIPT-WRLD/businesses/justintime/src/app/admin/users/[id]/page.tsx)

**Description:**
Detailed view of a specific user, including profile, bookings, wallet, and admin actions.

---

## Page Categories Summary

### Public Pages (15)
1. Home (`/`)
2. Services Listing (`/services`)
3. Service Details (`/services/[id]`)
4. Professionals Listing (`/professionals`)
5. Professional Details (`/professionals/[id]`)
6. Jobs Listing (`/jobs`)
7. Job Details (`/jobs/[id]`)
8. Booking/Checkout (`/booking`)
9. Blog (`/blog`)
10. About (`/about`)
11. Contact (`/contact`)
12. FAQ (`/faq`)
13. Privacy Policy (`/privacy`)
14. Terms of Service (`/terms`)
15. Cookie Policy (`/cookie-policy`)

### Authentication Pages (7)
1. Login (`/auth/login`)
2. Signup (`/auth/signup`)
3. Forgot Password (`/auth/forgot-password`)
4. Verification (`/auth/verify`)
5. Verify Request (`/auth/verify-request`)
6. Verify Email (`/auth/verify-email`)
7. Reset Password (`/auth/reset-password`)

### Onboarding (3)
1. Unified Onboarding (`/onboarding`)
2. Provider Onboarding (`/provider/onboarding`)
3. Client Onboarding (`/client/onboarding`)

### Service Provider Pages (15)
1. Dashboard Home (`/dashboard`)
2. Analytics (`/dashboard/analytics`)
3. Availability Management (`/dashboard/availability`)
4. Bookings (`/dashboard/bookings`)
5. Earnings (`/dashboard/earnings`)
6. Profile (`/dashboard/profile`)
7. Reviews (`/dashboard/reviews`)
8. Services Management (`/dashboard/services`)
9. Job Applications (`/dashboard/jobs`)
10. Job Requests (`/dashboard/requests`)
11. Messages (`/dashboard/messages`)
12. Notifications (`/dashboard/notifications`)
13. Settings (`/dashboard/settings`)
14. Premium/Upgrade (`/dashboard/premium`)
15. Help Center (`/dashboard/help`)

### Consumer / Client Pages (13)
1. Dashboard (`/client/dashboard`)
2. Analytics (`/client/analytics`)
3. Post Job (`/client/post-job`)
4. Job Details (`/client/jobs/[id]`)
5. Proposals (`/client/proposals`)
6. Bookings (`/client/bookings`)
7. Messages (`/client/messages`)
8. Profile (`/client/profile`)
9. Wallet (`/client/wallet`)
10. Notifications (`/client/notifications`)
11. Settings (`/client/settings`)
12. Referral (`/client/referral`)
13. Submit Review (`/client/reviews/submit/[bookingId]`)

### Admin Pages (11)
1. Login (`/admin/login`)
2. Dashboard Main (`/admin`)
3. Dashboard Analytics (`/admin/dashboard`)
4. User Management (`/admin/users`)
5. Disputes (`/admin/disputes`)
6. Bookings (`/admin/bookings`)
7. Verifications (`/admin/verifications`)
8. Finance (`/admin/finance`)
9. Support (`/admin/support`)
10. Settings (`/admin/settings`)
11. User Details (`/admin/users/[id]`)

---

## Total Pages: 64

**Last Updated:** 2025-11-28

## Recent Changes
- Added 12 new pages since last update (2025-11-27 → 2025-11-28)
- New auth pages: Verify Request, Verify Email, Reset Password
- New admin pages: Dashboard (Main), Disputes, Bookings, Verifications, Finance, Support, Settings, User Details
- Updated Admin Dashboard documentation to reflect the main entry point at `/admin`
