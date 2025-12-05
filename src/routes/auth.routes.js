// AUTHENTICATION ROUTES
// Routes for user authentication (register, login, logout, etc.)

const express = require("express");
const router = express.Router();

// Controllers
const authController = require("../controllers/auth.controller");

// Middleware
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  authLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimiter.middleware");

// Validators
const { registerSchema, loginSchema } = require("../utils/validators");

// PUBLIC ROUTES (No authentication required)

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new reseller account
 * @access  Public
 * @body    { name, email, phone, password }
 */
router.post(
  "/register",
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  validate(registerSchema),
  authController.register,
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and get JWT tokens
 * @access  Public
 * @body    { email, password }
 */
router.post(
  "/login",
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  validate(loginSchema),
  authController.login,
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 * @body    { refreshToken }
 */
router.post("/refresh", authController.refresh);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 * @body    { email }
 * @note    Not implemented yet (Phase 2)
 */
router.post(
  "/forgot-password",
  passwordResetLimiter, // Rate limit: 3 attempts per hour
  authController.forgotPassword,
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, newPassword }
 * @note    Not implemented yet (Phase 2)
 */
router.post(
  "/reset-password",
  passwordResetLimiter,
  authController.resetPassword,
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 * @body    { token }
 * @note    Not implemented yet (Phase 2)
 */
router.post("/verify-email", authController.verifyEmail);

// PROTECTED ROUTES (Authentication required)
/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private (Requires authentication)
 */
router.get("/me", authenticate, authController.getCurrentUser);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private (Requires authentication)
 * @body    { refreshToken } (optional)
 */
router.post("/logout", authenticate, authController.logout);

module.exports = router;
