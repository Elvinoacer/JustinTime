import { z } from "zod";

// User validation schemas
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["CLIENT", "PROVIDER"]).optional().default("CLIENT"),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

// Job validation schemas
export const createJobSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  budget: z.number().positive("Budget must be positive"),
  location: z.string().min(1, "Location is required"),
  images: z.array(z.string()).optional(),
});

export const updateJobSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  category: z.string().optional(),
  budget: z.number().positive().optional(),
  location: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  images: z.array(z.string()).optional(),
});

export const createProposalSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// Service validation schemas
export const createServiceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be positive"),
  duration: z.number().positive("Duration must be positive"),
});

export const createReviewSchema = z.object({
  rating: z.number().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(10, "Comment must be at least 10 characters"),
});

// Wallet validation schemas
export const topUpSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethodId: z.string().min(1, "Payment method is required"),
});

export const withdrawSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethodId: z.string().min(1, "Payment method is required"),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
});
