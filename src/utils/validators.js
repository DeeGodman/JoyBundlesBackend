// VALIDATION SCHEMAS
// This file contains **Zod schemas** that validate incoming data from API requests.

const { z } = require("zod");
const { RegexPatterns } = require("../constants");

// USER VALIDATION SCHEMAS

/**
 * Schema for user registration
 */
const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  phone: z
    .string()
    .regex(
      RegexPatterns.GHANA_PHONE,
      "Invalid Ghana phone number format. Use format: 0XXXXXXXXX or +233XXXXXXXXX",
    )
    .trim(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must not exceed 128 characters"),
});

/**
 * Schema for user login
 */
const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

/**
 * Schema for updating user profile
 */
const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(RegexPatterns.GHANA_PHONE, "Invalid Ghana phone number format")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Invalid email format")
    .toLowerCase()
    .trim()
    .optional(),
});

/**
 * Schema for password change
 */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(128, "Password must not exceed 128 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// BUNDLE VALIDATION SCHEMAS
/**
 * Schema for creating a bundle
 */
const createBundleSchema = z
  .object({
    name: z
      .string()
      .min(1, "Bundle name is required")
      .max(100, "Bundle name must not exceed 100 characters")
      .trim(),
    network: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(
        z.enum(["MTN", "TELECEL", "AT"], {
          errorMap: () => ({ message: "Network must be MTN, TELECEL, or AT" }),
        }),
      ),
    volume: z.string().min(1, "Volume is required").trim(),
    costPrice: z
      .number()
      .positive("Cost price must be positive")
      .min(0.01, "Cost price must be at least 0.01"),
    basePrice: z
      .number()
      .positive("Base price must be positive")
      .min(0.01, "Base price must be at least 0.01"),
    active: z.boolean().optional().default(true),
  })
  .refine((data) => data.basePrice >= data.costPrice, {
    message: "Base price must be greater than or equal to cost price",
    path: ["basePrice"],
  });

/**
 * Schema for updating a bundle
 */
const updateBundleSchema = z.object({
  name: z
    .string()
    .min(1, "Bundle name is required")
    .max(100, "Bundle name must not exceed 100 characters")
    .trim()
    .optional(),
  volume: z.string().trim().optional(),
  costPrice: z.number().positive().optional(),
  basePrice: z.number().positive().optional(),
  active: z.boolean().optional(),
});

// ORDER VALIDATION SCHEMAS
/**
 * Schema for creating an order
 */
const createOrderSchema = z.object({
  bundleId: z.string().uuid("Invalid bundle ID"),
  customerPhone: z
    .string()
    .regex(RegexPatterns.GHANA_PHONE, "Invalid Ghana phone number format")
    .trim(),
  referralCode: z.string().trim().optional(),
  paymentMethod: z
    .enum(["momo_mtn", "momo_telecel", "momo_at"], {
      errorMap: () => ({ message: "Invalid payment method" }),
    })
    .optional(),
});

/**
 * Schema for updating order status
 */
const updateOrderStatusSchema = z.object({
  status: z.enum(
    ["ACCEPTED", "PROCESSING", "DELIVERED", "FAILED", "REFUNDED"],
    {
      errorMap: () => ({ message: "Invalid order status" }),
    },
  ),
  notes: z.string().trim().optional(),
});

// RESELLER VALIDATION SCHEMAS
/**
 * Schema for approving/rejecting reseller
 */
const updateResellerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "REJECTED"], {
    errorMap: () => ({ message: "Invalid status" }),
  }),
  rejectionReason: z.string().trim().optional(),
});

/**
 * Schema for updating reseller pricing
 */
const updateResellerPricingSchema = z.object({
  pricingMode: z.enum(["PRESET", "CUSTOM"], {
    errorMap: () => ({ message: "Pricing mode must be PRESET or CUSTOM" }),
  }),
  presetCommission: z
    .number()
    .nonnegative("Commission must be non-negative")
    .optional(),
  customPricing: z
    .array(
      z.object({
        bundleId: z.string().uuid("Invalid bundle ID"),
        commission: z.number().nonnegative("Commission must be non-negative"),
      }),
    )
    .optional(),
});

// ===================================
// SUPPORT TICKET VALIDATION SCHEMAS
// ===================================

/**
 * Schema for creating support ticket
 */
const createSupportTicketSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  customerPhone: z
    .string()
    .regex(RegexPatterns.GHANA_PHONE, "Invalid Ghana phone number format")
    .trim(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must not exceed 1000 characters")
    .trim(),
});

/**
 * Schema for updating ticket status
 */
const updateTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"], {
    errorMap: () => ({ message: "Invalid ticket status" }),
  }),
});

/**
 * Schema for adding ticket message
 */
const addTicketMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(1000, "Message must not exceed 1000 characters")
    .trim(),
  senderType: z.enum(["customer", "admin"], {
    errorMap: () => ({ message: "Sender type must be customer or admin" }),
  }),
});

// QUERY VALIDATION SCHEMAS
/**
 * Schema for pagination query params
 */
const paginationSchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional()
    .default("1"),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .optional()
    .default("20"),
});

/**
 * Schema for search query
 */
const searchSchema = z.object({
  q: z.string().trim().optional(),
  status: z.string().trim().optional(),
  network: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ID VALIDATION SCHEMAS
/**
 * Schema for UUID validation
 */
const uuidSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

/**
 * Schema for order number validation
 */
const orderNumberSchema = z.object({
  orderNumber: z
    .string()
    .regex(RegexPatterns.ORDER_NUMBER, "Invalid order number format")
    .trim(),
});

/**
 * Schema for phone number validation
 */
const phoneNumberSchema = z.object({
  phone: z
    .string()
    .regex(RegexPatterns.GHANA_PHONE, "Invalid Ghana phone number format")
    .trim(),
});

// EXPORT ALL SCHEMAS
module.exports = {
  // User schemas
  registerSchema,
  loginSchema,
  updateUserSchema,
  changePasswordSchema,

  // Bundle schemas
  createBundleSchema,
  updateBundleSchema,

  // Order schemas
  createOrderSchema,
  updateOrderStatusSchema,

  // Reseller schemas
  updateResellerStatusSchema,
  updateResellerPricingSchema,

  // Support schemas
  createSupportTicketSchema,
  updateTicketStatusSchema,
  addTicketMessageSchema,

  // Query schemas
  paginationSchema,
  searchSchema,

  // ID schemas
  uuidSchema,
  orderNumberSchema,
  phoneNumberSchema,
};
