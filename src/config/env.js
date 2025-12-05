// ENVIRONMENT CONFIGURATION
// Loads and validates environment variables from .env file

const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Validate that required environment variables are set
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {*} The environment variable value or default
 */
const getEnvVar = (key, defaultValue = undefined) => {
  const value = process.env[key];

  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value || defaultValue;
};

/**
 * Parse boolean environment variables
 * @param {string} key - Environment variable name
 * @param {boolean} defaultValue - Default boolean value
 * @returns {boolean}
 */
const getEnvBool = (key, defaultValue = false) => {
  const value = process.env[key];

  if (!value) return defaultValue;

  return value.toLowerCase() === "true" || value === "1";
};

/**
 * Parse integer environment variables
 * @param {string} key - Environment variable name
 * @param {number} defaultValue - Default number value
 * @returns {number}
 */
const getEnvInt = (key, defaultValue = 0) => {
  const value = process.env[key];

  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer`);
  }

  return parsed;
};

/**
 * Application configuration object
 */
const config = {
  // Environment
  nodeEnv: getEnvVar("NODE_ENV", "development"),
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",

  // Server
  port: getEnvInt("PORT", 5000),
  apiPrefix: getEnvVar("API_PREFIX", "/api/v1"),

  // Database
  database: {
    url: getEnvVar("DATABASE_URL"),
  },

  // JWT Authentication
  jwt: {
    secret: getEnvVar("JWT_SECRET"),
    expiresIn: getEnvVar("JWT_EXPIRES_IN", "7d"),
    refreshSecret: getEnvVar("JWT_REFRESH_SECRET"),
    refreshExpiresIn: getEnvVar("JWT_REFRESH_EXPIRES_IN", "30d"),
  },

  // Security
  bcryptRounds: getEnvInt("BCRYPT_ROUNDS", 10),

  // Rate Limiting
  rateLimit: {
    windowMs: getEnvInt("RATE_LIMIT_WINDOW_MS", 60000), // 1 minute
    maxRequests: getEnvInt("RATE_LIMIT_MAX_REQUESTS", 100),
  },

  // CORS
  frontend: {
    url: getEnvVar("FRONTEND_URL", "http://localhost:3000"),
  },

  // Payment Gateway (for future use)
  payment: {
    provider: getEnvVar("PAYMENT_PROVIDER", "paystack"),
    publicKey: getEnvVar("PAYMENT_PUBLIC_KEY", ""),
    secretKey: getEnvVar("PAYMENT_SECRET_KEY", ""),
    webhookSecret: getEnvVar("PAYMENT_WEBHOOK_SECRET", ""),
  },

  // Logging
  logLevel: getEnvVar("LOG_LEVEL", "debug"),
};

/**
 * Validate critical configuration on startup
 */
const validateConfig = () => {
  const requiredVars = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env file and ensure all required variables are set.",
    );
  }

  // Validate JWT secrets are strong enough
  if (config.jwt.secret.length < 32) {
    console.warn(
      "⚠️  Warning: JWT_SECRET should be at least 32 characters long for security",
    );
  }

  if (config.jwt.refreshSecret.length < 32) {
    console.warn(
      "⚠️  Warning: JWT_REFRESH_SECRET should be at least 32 characters long for security",
    );
  }

  console.log("✅ Configuration validated successfully");
};

// Run validation on import (only in production)
if (config.isProduction) {
  validateConfig();
}

module.exports = { config, validateConfig };
