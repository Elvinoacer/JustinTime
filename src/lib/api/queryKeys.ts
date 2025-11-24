/**
 * Query Keys Factory
 * Centralized management of all query keys for TanStack Query
 * This ensures consistency and makes cache invalidation easier
 */

export const queryKeys = {
  // Authentication
  auth: {
    all: ["auth"] as const,
    currentUser: () => [...queryKeys.auth.all, "current-user"] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Jobs
  jobs: {
    all: ["jobs"] as const,
    lists: () => [...queryKeys.jobs.all, "list"] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    proposals: (jobId: string) => 
      [...queryKeys.jobs.detail(jobId), "proposals"] as const,
  },

  // Services
  services: {
    all: ["services"] as const,
    lists: () => [...queryKeys.services.all, "list"] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.services.lists(), filters] as const,
    details: () => [...queryKeys.services.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.services.details(), id] as const,
    reviews: (serviceId: string) => 
      [...queryKeys.services.detail(serviceId), "reviews"] as const,
  },

  // Wallet
  wallet: {
    all: ["wallet"] as const,
    balance: () => [...queryKeys.wallet.all, "balance"] as const,
    transactions: (filters?: Record<string, any>) => 
      [...queryKeys.wallet.all, "transactions", filters] as const,
    paymentMethods: () => 
      [...queryKeys.wallet.all, "payment-methods"] as const,
  },

  // Messages
  messages: {
    all: ["messages"] as const,
    conversations: () => [...queryKeys.messages.all, "conversations"] as const,
    conversation: (conversationId: string) => 
      [...queryKeys.messages.conversations(), conversationId] as const,
  },

  // Notifications
  notifications: {
    all: ["notifications"] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.notifications.all, "list", filters] as const,
  },

  // Bookings
  bookings: {
    all: ["bookings"] as const,
    lists: () => [...queryKeys.bookings.all, "list"] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.bookings.lists(), filters] as const,
    details: () => [...queryKeys.bookings.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
  },

  // Reviews
  reviews: {
    all: ["reviews"] as const,
    lists: () => [...queryKeys.reviews.all, "list"] as const,
    list: (filters?: Record<string, any>) => 
      [...queryKeys.reviews.lists(), filters] as const,
    details: () => [...queryKeys.reviews.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.reviews.details(), id] as const,
  },

  // Admin
  admin: {
    all: ["admin"] as const,
    users: (filters?: Record<string, any>) => 
      [...queryKeys.admin.all, "users", filters] as const,
    jobs: (filters?: Record<string, any>) => 
      [...queryKeys.admin.all, "jobs", filters] as const,
    analytics: () => [...queryKeys.admin.all, "analytics"] as const,
    verifications: (filters?: Record<string, any>) => 
      [...queryKeys.admin.all, "verifications", filters] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
