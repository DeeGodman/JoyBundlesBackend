// ERROR MIDDLEWARE
// Global error handler for catching and formatting all errors

const { HttpStatus, ErrorMessages } = require("../constants");
const { errorResponse, formatPrismaError } = require("../utils/response.util");
const { config } = require("../config/env");

/**
 * Global error handler middleware
 * Catches all errors thrown in the application and returns standardized error responses
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging (in development)
  if (config.isDevelopment) {
    console.error("❌ Error caught by error handler:");
    console.error(err);
  }

  // Default error
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = ErrorMessages.INTERNAL_ERROR;
  let errors = null;

  // PRISMA ERRORS
  if (err.code && err.code.startsWith("P")) {
    // Prisma error codes start with 'P'
    message = formatPrismaError(err);

    switch (err.code) {
      case "P2002":
        // Unique constraint violation
        statusCode = HttpStatus.CONFLICT;
        break;

      case "P2025":
        // Record not found
        statusCode = HttpStatus.NOT_FOUND;
        break;

      case "P2003":
        // Foreign key constraint failed
        statusCode = HttpStatus.BAD_REQUEST;
        break;

      default:
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  // ZOD VALIDATION ERRORS
  else if (err.name === "ZodError") {
    statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    message = ErrorMessages.VALIDATION_ERROR;
    errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
  }

  // JWT ERRORS
  else if (err.name === "JsonWebTokenError") {
    statusCode = HttpStatus.UNAUTHORIZED;
    message = ErrorMessages.INVALID_TOKEN;
  } else if (err.name === "TokenExpiredError") {
    statusCode = HttpStatus.UNAUTHORIZED;
    message = ErrorMessages.TOKEN_EXPIRED;
  }

  // CUSTOM APPLICATION ERRORS
  else if (err.statusCode) {
    // Custom error with statusCode property
    statusCode = err.statusCode;
    message = err.message || message;
    errors = err.errors || null;
  }

  // VALIDATION ERRORS (from express-validator)
  else if (err.errors && Array.isArray(err.errors)) {
    statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    message = ErrorMessages.VALIDATION_ERROR;
    errors = err.errors;
  }

  // GENERIC ERRORS
  else if (err.message) {
    message = err.message;
  }

  // Log error to monitoring service in production
  if (config.isProduction) {
    // TODO: Send to Sentry or other error tracking service
    console.error("Production Error:", {
      message: err.message,
      stack: err.stack,
      statusCode,
      url: req.url,
      method: req.method,
      userId: req.user?.userId,
    });
  }

  // Send error response
  return errorResponse(res, message, statusCode, errors);
};

/**
 * 404 Not Found handler
 * Catches requests to non-existent routes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    `Cannot ${req.method} ${req.url} - Route not found`,
    HttpStatus.NOT_FOUND,
  );
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 *
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await prisma.user.findMany();
 *   return successResponse(res, users);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error
 * Factory function for creating custom errors with status codes
 *
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Additional error details
 * @returns {Error} Custom error object
 *
 * @example
 * throw createError('User not found', HttpStatus.NOT_FOUND);
 */
const createError = (
  message,
  statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
  errors = null,
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.errors = errors;
  return error;
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
};
