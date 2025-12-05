// APPLICATION CONSTANTS
// Central location for all app-wide constants, enums, and messages

// USER ROLES
const UserRole = {
  ADMIN: "ADMIN",
  RESELLER: "RESELLER",
};

// USER STATUS
const UserStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  REJECTED: "REJECTED",
};

// ORDER STATUS
const OrderStatus = {
  ACCEPTED: "ACCEPTED",
  PROCESSING: "PROCESSING",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

// PAYMENT STATUS
const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

// NETWORKS
const Network = {
  MTN: "MTN",
  TELECEL: "TELECEL",
  AT: "AT",
};

// PRICING MODE
const PricingMode = {
  PRESET: "PRESET",
  CUSTOM: "CUSTOM",
};

// TICKET STATUS
const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
};

// TRANSACTION TYPE
const TransactionType = {
  ORDER_PAYMENT: "ORDER_PAYMENT",
  COMMISSION_EARNING: "COMMISSION_EARNING",
  WITHDRAWAL: "WITHDRAWAL",
  REFUND: "REFUND",
};

// TRANSACTION STATUS
const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

// HTTP STATUS CODES
const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// ERROR MESSAGES
const ErrorMessages = {
  // Authentication
  INVALID_CREDENTIALS: "Invalid email or password",
  UNAUTHORIZED: "Authentication required",
  UNAUTHORIZED_ACCESS: "You do not have permission to access this resource",
  FORBIDDEN: "You do not have permission to perform this action",
  TOKEN_EXPIRED: "Token has expired",
  INVALID_TOKEN: "Invalid or malformed token",

  // User
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User with this email or phone already exists",
  USER_NOT_ACTIVE: "Your account is not active. Please contact support",
  USER_PENDING_APPROVAL: "Your account is pending approval",
  USER_SUSPENDED: "Your account has been suspended",
  USER_REJECTED: "Your registration has been rejected",

  // Reseller
  RESELLER_NOT_FOUND: "Reseller not found",
  RESELLER_ALREADY_EXISTS: "Reseller account already exists",
  INVALID_REFERRAL_CODE: "Invalid referral code",

  // Bundle
  BUNDLE_NOT_FOUND: "Bundle not found",
  BUNDLE_NOT_ACTIVE: "This bundle is currently unavailable",
  BUNDLE_ALREADY_EXISTS: "Bundle with this name and network already exists",

  // Order
  ORDER_NOT_FOUND: "Order not found",
  ORDER_ALREADY_PROCESSED: "This order has already been processed",
  INVALID_PHONE_NUMBER: "Invalid phone number format",

  // Payment
  PAYMENT_FAILED: "Payment processing failed",
  INSUFFICIENT_FUNDS: "Insufficient funds",
  PAYMENT_ALREADY_PROCESSED: "Payment already processed",

  // Validation
  VALIDATION_ERROR: "Validation error",
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Invalid email format",
  INVALID_PASSWORD: "Password must be at least 6 characters",
  PASSWORD_MISMATCH: "Passwords do not match",

  // General
  INTERNAL_ERROR: "An internal server error occurred",
  NOT_FOUND: "Resource not found",
  BAD_REQUEST: "Bad request",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later",
};

// SUCCESS MESSAGES
const SuccessMessages = {
  // Authentication
  REGISTER_SUCCESS: "Registration successful. Your account is pending approval",
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  TOKEN_REFRESHED: "Token refreshed successfully",

  // User
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  USER_SUSPENDED: "User suspended successfully",
  USER_ACTIVATED: "User activated successfully",
  UNAUTHORIZED_ACCESS: "You do not have permission to access this resource",

  // Reseller
  RESELLER_APPROVED: "Reseller approved successfully",
  RESELLER_REJECTED: "Reseller rejected successfully",
  RESELLER_SUSPENDED: "Reseller suspended successfully",

  // Bundle
  BUNDLE_CREATED: "Bundle created successfully",
  BUNDLE_UPDATED: "Bundle updated successfully",
  BUNDLE_DELETED: "Bundle deleted successfully",

  // Order
  ORDER_CREATED: "Order created successfully",
  ORDER_UPDATED: "Order status updated successfully",
  ORDER_DELIVERED: "Order delivered successfully",

  // Payment
  PAYMENT_SUCCESS: "Payment processed successfully",
  REFUND_SUCCESS: "Refund processed successfully",

  // Support
  TICKET_CREATED: "Support ticket created successfully",
  TICKET_RESOLVED: "Support ticket resolved successfully",
};

// REGEX PATTERNS
const RegexPatterns = {
  // Ghana phone number: 10 digits starting with 0 or +233
  GHANA_PHONE: /^(?:\+233|0)[2-5]\d{8}$/,

  // Email
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Password: At least 6 characters
  PASSWORD: /^.{6,}$/,

  // Order number: ORD-XXX format
  ORDER_NUMBER: /^ORD-\d{3,}$/,

  // Reseller ID: RES-XXX format
  RESELLER_ID: /^RES-\d{3}$/,

  // Ticket number: TKT-XXXXX format
  TICKET_NUMBER: /^TKT-\d{5}$/,
};

// PAGINATION
const Pagination = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// RESELLER SETTINGS
const ResellerSettings = {
  MIN_WITHDRAWAL_AMOUNT: 50.0,
  DEFAULT_COMMISSION_LOW: 2.0,
  DEFAULT_COMMISSION_MEDIUM: 5.0,
  DEFAULT_COMMISSION_HIGH: 10.0,
};

// ORDER SETTINGS
const OrderSettings = {
  MAX_DELIVERY_ATTEMPTS: 3,
  RETRY_DELAY_MINUTES: 5,
};

// EXPORT ALL CONSTANTS
module.exports = {
  // Enums
  UserRole,
  UserStatus,
  OrderStatus,
  PaymentStatus,
  Network,
  PricingMode,
  TicketStatus,
  TransactionType,
  TransactionStatus,

  // HTTP
  HttpStatus,

  // Messages
  ErrorMessages,
  SuccessMessages,

  // Patterns
  RegexPatterns,

  // Settings
  Pagination,
  ResellerSettings,
  OrderSettings,
};
