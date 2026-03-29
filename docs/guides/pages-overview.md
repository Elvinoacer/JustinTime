# Pages Overview (Current)

This document is the current inventory of App Router pages in this project.

Source of truth:

- File scan of `src/app/**/page.tsx`
- Last updated: 2026-03-29

## Summary

- Total pages (`page.tsx`): **86**
- Public and entry pages: **24**
- Auth pages: **8**
- Client pages: **14**
- Provider dashboard pages: **27**
- Admin pages: **13**

## Public and Entry Pages (24)

- /
- /about
- /admin
- /blog
- /booking
- /bookings/[id]/invoice
- /contact
- /cookie-policy
- /dashboard
- /faq
- /jobs
- /jobs/[id]
- /join
- /onboarding
- /privacy
- /professionals
- /professionals/[id]
- /provider/onboarding
- /services
- /services/[id]
- /solar
- /solar/estimate
- /terms
- /wallet

## Auth Pages (8)

- /auth/error
- /auth/forgot-password
- /auth/login
- /auth/reset-password
- /auth/signup
- /auth/verify
- /auth/verify-email
- /auth/verify-request

## Client Pages (14)

- /client/analytics
- /client/bookings
- /client/dashboard
- /client/jobs/[id]
- /client/messages
- /client/notifications
- /client/onboarding
- /client/post-job
- /client/profile
- /client/proposals
- /client/referral
- /client/reviews/submit/[bookingId]
- /client/settings
- /client/wallet

## Provider Dashboard Pages (27)

- /dashboard/achievements
- /dashboard/analytics
- /dashboard/availability
- /dashboard/bookings
- /dashboard/earnings
- /dashboard/expenses
- /dashboard/help
- /dashboard/invoices
- /dashboard/jobs
- /dashboard/messages
- /dashboard/notifications
- /dashboard/onboarding-complete
- /dashboard/premium
- /dashboard/profile
- /dashboard/requests
- /dashboard/reviews
- /dashboard/safety
- /dashboard/services
- /dashboard/settings
- /dashboard/settings/tax
- /dashboard/surge-pricing-demo
- /dashboard/team
- /dashboard/team/jobs
- /dashboard/team/members
- /dashboard/team/payroll
- /dashboard/verification
- /dashboard/wallet/topup-complete

## Admin Pages (13)

- /admin/bookings
- /admin/churn-analysis
- /admin/dashboard
- /admin/disputes
- /admin/finance
- /admin/login
- /admin/logs
- /admin/marketing/promos
- /admin/settings
- /admin/support
- /admin/users
- /admin/users/[id]
- /admin/verifications

## Notes

- This file documents routes backed by `page.tsx` files only.
- Metadata and special non-page routes (for example `/robots.txt`, `/sitemap.xml`, and `/_not-found`) are generated from other App Router files and are intentionally not counted here.
