// ===================================
// DATABASE CONFIGURATION
// ===================================
// Mongoose connection management for MongoDB

const mongoose = require("mongoose");
const { config } = require("./env");

/**
 * Connect to MongoDB using Mongoose
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");

    // Mongoose connection options
    const options = {
      // Use new URL parser
      useNewUrlParser: true,
      useUnifiedTopology: true,

      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,

      // Timeout settings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,

      // Retry settings
      retryWrites: true,
      w: "majority",
    };

    // Connect to MongoDB
    await mongoose.connect(config.database.url, options);

    console.log("✅ MongoDB connected successfully");
    console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);

    // Connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("✅ Mongoose connected to MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  Mongoose disconnected from MongoDB");
    });
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB disconnected successfully");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error);
    throw error;
  }
};

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      // Connected
      await mongoose.connection.db.admin().ping();
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
};

/**
 * Get database health status
 * @returns {Promise<Object>}
 */
const getHealthStatus = async () => {
  try {
    const startTime = Date.now();

    if (mongoose.connection.readyState !== 1) {
      return {
        status: "unhealthy",
        error: "Database not connected",
        timestamp: new Date().toISOString(),
      };
    }

    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - startTime;

    return {
      status: "healthy",
      responseTime: `${responseTime}ms`,
      readyState: getReadyStateText(mongoose.connection.readyState),
      database: mongoose.connection.db.databaseName,
      host: mongoose.connection.host,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Get human-readable ready state text
 * @param {number} state - Mongoose ready state
 * @returns {string}
 */
const getReadyStateText = (state) => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[state] || "unknown";
};

/**
 * Handle graceful shutdown
 */
const handleShutdown = async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await disconnectDatabase();
  process.exit(0);
};

// Register shutdown handlers
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

/**
 * Clear all collections (for testing purposes only)
 * WARNING: This will delete all data!
 * @returns {Promise<void>}
 */
const clearDatabase = async () => {
  if (config.nodeEnv === "production") {
    throw new Error("Cannot clear database in production!");
  }

  try {
    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      await collection.deleteMany({});
    }

    console.log("✅ Database cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  }
};

/**
 * Get database statistics
 * @returns {Promise<Object>}
 */
const getDatabaseStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();

    return {
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      indexes: stats.indexes,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      documents: stats.objects,
    };
  } catch (error) {
    console.error("❌ Error getting database stats:", error);
    throw error;
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  testConnection,
  getHealthStatus,
  getDatabaseStats,
  clearDatabase,
  mongoose,
};
