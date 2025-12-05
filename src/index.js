// SERVER ENTRY POINT
// Main entry point - starts the HTTP server and connects to database

const app = require("./app");
const { config, validateConfig } = require("./config/env");
const {
  connectDatabase,
  disconnectDatabase,
  testConnection,
} = require("./config/database");

// VALIDATE CONFIGURATION
console.log("🔍 Validating configuration...");
try {
  validateConfig();
} catch (error) {
  console.error("❌ Configuration validation failed:", error.message);
  process.exit(1);
}

// CONNECT TO DATABASE
const startServer = async () => {
  try {
    console.log("🔌 Connecting to database...");
    await connectDatabase();

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error("Database connection test failed");
    }

    console.log("✅ Database connected successfully");

    // START HTTP SERVER
    const PORT = config.port || 5000;

    const server = app.listen(PORT, () => {
      console.log("\n" + "=".repeat(50));
      console.log("🚀 JoyBundles API Server");
      console.log("=".repeat(50));
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(
        `📡 API Base URL: http://localhost:${PORT}${config.apiPrefix}`,
      );
      console.log(
        `💚 Health Check: http://localhost:${PORT}${config.apiPrefix}/health`,
      );
      console.log(`📚 API Info: http://localhost:${PORT}${config.apiPrefix}`);
      console.log("=".repeat(50) + "\n");
    });

    // GRACEFUL SHUTDOWN
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log("🛑 HTTP server closed");

        try {
          // Disconnect from database
          await disconnectDatabase();
          console.log("✅ Graceful shutdown completed");
          process.exit(0);
        } catch (error) {
          console.error("❌ Error during shutdown:", error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("❌ Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    // Listen for shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// ===================================
// START THE SERVER
// ===================================

startServer();
