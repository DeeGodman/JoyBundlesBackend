// EXPRESS APPLICATION SETUP
// Main Express app configuration with middleware and routes

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
// Import the queues you created
const { paymentQueue } = require("./services/queues/payment.queue");

// Configuration
const { config } = require("./config/env");

// Middleware
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/error.middleware");
const { generalLimiter } = require("./middleware/rateLimiter.middleware");

// Routes
const routes = require("./routes");

// CREATE EXPRESS APP
const app = express();

// SECURITY MIDDLEWARE
// Helmet - Set security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS - Enable cross-origin requests
app.use(
  cors({
    origin: config.frontend.url,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// BODY PARSING MIDDLEWARE
// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Parse cookies
app.use(cookieParser());

// ===================================
// [NEW] 2. SETUP BULL BOARD
// ===================================
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues"); // This is your Dashboard URL

createBullBoard({
  queues: [new BullAdapter(paymentQueue)],
  serverAdapter: serverAdapter,
});

// ===================================
// LOGGING MIDDLEWARE
// ===================================

// Morgan - HTTP request logger (only in development)
if (config.isDevelopment) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ===================================
// RATE LIMITING
// ===================================

// Apply general rate limiting to all routes
app.use(generalLimiter);

// [NEW] 3. MOUNT THE DASHBOARD ROUTE
app.use("/admin/queues", serverAdapter.getRouter());

// ===================================
// API ROUTES
// ===================================

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to JoyBundles API",
    version: "1.0.0",
    documentation: "/api/v1",
    health: "/api/v1/health",
  });
});

// Mount API routes with version prefix
app.use(config.apiPrefix, routes);

// ===================================
// ERROR HANDLING
// ===================================

// 404 handler - Must be after all routes
app.use(notFoundHandler);

// Global error handler - Must be last
app.use(errorHandler);

// ===================================
// EXPORT APP
// ===================================

module.exports = app;
