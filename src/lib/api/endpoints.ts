/**
 * Centralized API endpoints
 * All API routes are defined here for easy management and type safety
 */

export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: "/auth/login",
    signup: "/auth/signup",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    verify: "/auth/verify",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },

  // Users
  users: {
    me: "/users/me",
    byId: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
    list: "/users",
    uploadAvatar: "/users/avatar",
  },

  // Jobs
  jobs: {
    list: "/jobs",
    byId: (id: string) => `/jobs/${id}`,
    create: "/jobs",
    update: (id: string) => `/jobs/${id}`,
    delete: (id: string) => `/jobs/${id}`,
    proposals: (jobId: string) => `/jobs/${jobId}/proposals`,
    submitProposal: (jobId: string) => `/jobs/${jobId}/proposals`,
  },

  // Services
  services: {
    list: "/services",
    byId: (id: string) => `/services/${id}`,
    create: "/services",
    update: (id: string) => `/services/${id}`,
    delete: (id: string) => `/services/${id}`,
    reviews: (serviceId: string) => `/services/${serviceId}/reviews`,
  },

  // Wallet & Payments
  wallet: {
    balance: "/wallet/balance",
    transactions: "/wallet/transactions",
    topUp: "/wallet/topup",
    details: "/wallet",
  },

  // Messages
  messages: {
    conversations: "/messages/conversations",
    byConversation: (conversationId: string) =>
      `/messages/conversations/${conversationId}`,
    send: "/messages/send",
    markAsRead: (messageId: string) => `/messages/${messageId}/read`,
  },

  // Notifications
  notifications: {
    list: "/notifications",
    markAsRead: (id: string) => `/notifications/${id}/read`,
    markAllAsRead: "/notifications/mark-all-read",
  },

  // Bookings
  bookings: {
    list: "/bookings",
    byId: (id: string) => `/bookings/${id}`,
    create: "/bookings",
    update: (id: string) => `/bookings/${id}`,
    cancel: (id: string) => `/bookings/${id}/cancel`,
  },

  // Reviews
  reviews: {
    list: "/reviews",
    byId: (id: string) => `/reviews/${id}`,
    create: "/reviews",
    update: (id: string) => `/reviews/${id}`,
    delete: (id: string) => `/reviews/${id}`,
  },

  // Admin
  admin: {
    users: "/admin/users",
    jobs: "/admin/jobs",
    analytics: "/admin/analytics",
    verifications: "/admin/verifications",
    approve: (id: string) => `/admin/verifications/${id}/approve`,
    reject: (id: string) => `/admin/verifications/${id}/reject`,
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
