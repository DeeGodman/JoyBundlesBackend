// MAIN ROUTER
// Combines all route modules and exports the main API router

const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const orderRoutes = require("./order.routes");
const webhookRoutes = require("./webhook.routes");

// HEALTH CHECK ROUTE
/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API ROUTES
/**
 * Mount route modules
 *
 * Base URL: /api/v1
 * - /api/v1/auth/*    - Authentication routes
 * - /api/v1/users/*   - User management routes
 */
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/orders", orderRoutes);
router.use("/webhooks", webhookRoutes);

// API INFO ROUTE
/**
 * @route   GET /api/v1
 * @desc    API information and available endpoints
 * @access  Public
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "JoyBundles API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/v1/auth/register",
        login: "POST /api/v1/auth/login",
        logout: "POST /api/v1/auth/logout",
        refresh: "POST /api/v1/auth/refresh",
        me: "GET /api/v1/auth/me",
      },
      users: {
        getAll: "GET /api/v1/users",
        getById: "GET /api/v1/users/:id",
        update: "PUT /api/v1/users/:id",
        delete: "DELETE /api/v1/users/:id",
        resellers: "GET /api/v1/users/resellers",
        approve: "POST /api/v1/users/:id/approve",
        reject: "POST /api/v1/users/:id/reject",
        suspend: "POST /api/v1/users/:id/suspend",
        activate: "POST /api/v1/users/:id/activate",
      },
    },
    documentation: "Coming soon",
  });
});

module.exports = router;
