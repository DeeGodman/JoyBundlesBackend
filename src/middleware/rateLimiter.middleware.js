// RATE LIMITER MIDDLEWARE
// Middleware to prevent API abuse with rate limiting

const rateLimit = require("express-rate-limit");
const { config } = require("../config/env");
const { rateLimitResponse } = require("../utils/response.util");

/**
 * General rate limiter for all API routes
 * Limits requests per IP address
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // Time window (default: 1 minute)
  max: config.rateLimit.maxRequests, // Max requests per window (default: 100)
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      "Too many requests from this IP. Please try again later.",
    );
  },
  skip: (req) => {
    // Skip rate limiting in development
    return config.isDevelopment;
  },
});

/**
 * Strict rate limiter for authentication routes
 * Prevents brute force attacks on login/register
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: "Too many authentication attempts. Please try again in 15 minutes",
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      "Too many login/registration attempts. Please try again in 15 minutes.",
    );
  },
  skip: (req) => {
    return config.isDevelopment;
  },
});

/**
 * Rate limiter for password reset requests
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: "Too many password reset requests. Please try again later",
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      "Too many password reset requests. Please try again in 1 hour.",
    );
  },
  skip: (req) => {
    return config.isDevelopment;
  },
});

/**
 * Rate limiter for creating orders
 * Prevents spam orders
 */
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 orders per minute
  message: "Too many order requests. Please slow down",
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      "You are creating orders too quickly. Please wait a moment.",
    );
  },
  skip: (req) => {
    return config.isDevelopment;
  },
});

/**
 * Rate limiter for support ticket creation
 */
const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 tickets per hour
  message: "Too many support requests. Please try again later",
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      "You have submitted too many support tickets. Please try again in 1 hour.",
    );
  },
  skip: (req) => {
    return config.isDevelopment;
  },
});

/**
 * Rate limiter for API key/sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: "Too many requests for this sensitive operation",
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      "Too many requests. Please try again in 15 minutes.",
    );
  },
  skip: (req) => {
    return config.isDevelopment;
  },
});

/**
 * Custom rate limiter factory
 * Create custom rate limiters with specific settings
 *
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @returns {Function} Rate limiter middleware
 *
 * @example
 * const customLimiter = createRateLimiter({
 *   windowMs: 60000,
 *   max: 20,
 *   message: 'Custom rate limit exceeded'
 * });
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60000,
    max = 100,
    message = "Too many requests",
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return rateLimitResponse(res, message);
    },
    skip: (req) => {
      return config.isDevelopment;
    },
  });
};

/**
 * Dynamic rate limiter based on user role
 * Admins get higher limits than regular users
 */
const dynamicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Admin users get higher limits
    if (req.user && req.user.role === "ADMIN") {
      return 200; // 200 requests per minute for admins
    }
    // Resellers get moderate limits
    if (req.user && req.user.role === "RESELLER") {
      return 100; // 100 requests per minute for resellers
    }
    // Anonymous/unauthenticated users get lower limits
    return 50; // 50 requests per minute for others
  },
  message: "Rate limit exceeded",
  handler: (req, res) => {
    return rateLimitResponse(
      res,
      "You have exceeded your rate limit. Please try again later.",
    );
  },
  skip: (req) => {
    return config.isDevelopment;
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  orderLimiter,
  supportLimiter,
  strictLimiter,
  createRateLimiter,
  dynamicLimiter,
};
