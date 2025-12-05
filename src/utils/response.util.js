// RESPONSE UTILITY
// Standardized API response formatters

const { HttpStatus } = require("../constants");

/**
 * Standard success response format
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Express response
 */
const successResponse = (
  res,
  data = null,
  message = "Success",
  statusCode = HttpStatus.OK,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Standard error response format
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Additional error details
 * @returns {Object} Express response
 */
const errorResponse = (
  res,
  message = "Error",
  statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
  errors = null,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Paginated response format
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 * @returns {Object} Express response
 */
const paginatedResponse = (
  res,
  data,
  page,
  limit,
  total,
  message = "Success",
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return res.status(HttpStatus.OK).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      limit,
      total,
      hasNextPage,
      hasPrevPage,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 * @returns {Object} Express response
 */
const createdResponse = (
  res,
  data,
  message = "Resource created successfully",
) => {
  return successResponse(res, data, message, HttpStatus.CREATED);
};

/**
 * No content response (204)
 * @param {Object} res - Express response object
 * @returns {Object} Express response
 */
const noContentResponse = (res) => {
  return res.status(HttpStatus.NO_CONTENT).send();
};

/**
 * Bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {*} errors - Validation errors
 * @returns {Object} Express response
 */
const badRequestResponse = (res, message = "Bad request", errors = null) => {
  return errorResponse(res, message, HttpStatus.BAD_REQUEST, errors);
};

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const unauthorizedResponse = (res, message = "Unauthorized") => {
  return errorResponse(res, message, HttpStatus.UNAUTHORIZED);
};

/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const forbiddenResponse = (res, message = "Forbidden") => {
  return errorResponse(res, message, HttpStatus.FORBIDDEN);
};

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const notFoundResponse = (res, message = "Resource not found") => {
  return errorResponse(res, message, HttpStatus.NOT_FOUND);
};

/**
 * Conflict response (409)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const conflictResponse = (res, message = "Conflict") => {
  return errorResponse(res, message, HttpStatus.CONFLICT);
};

/**
 * Validation error response (422)
 * @param {Object} res - Express response object
 * @param {*} errors - Validation errors
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const validationErrorResponse = (
  res,
  errors,
  message = "Validation failed",
) => {
  return errorResponse(res, message, HttpStatus.UNPROCESSABLE_ENTITY, errors);
};

/**
 * Rate limit response (429)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const rateLimitResponse = (res, message = "Too many requests") => {
  return errorResponse(res, message, HttpStatus.TOO_MANY_REQUESTS);
};

/**
 * Internal server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 */
const internalErrorResponse = (res, message = "Internal server error") => {
  return errorResponse(res, message, HttpStatus.INTERNAL_SERVER_ERROR);
};

/**
 * Format Zod validation errors
 * @param {Object} zodError - Zod error object
 * @returns {Array} Formatted errors
 */
const formatZodErrors = (zodError) => {
  return zodError.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
};

/**
 * Format Prisma errors
 * @param {Object} prismaError - Prisma error object
 * @returns {string} User-friendly error message
 */
const formatPrismaError = (prismaError) => {
  switch (prismaError.code) {
    case "P2002":
      // Unique constraint violation
      const field = prismaError.meta?.target?.[0] || "field";
      return `A record with this ${field} already exists`;

    case "P2025":
      // Record not found
      return "Record not found";

    case "P2003":
      // Foreign key constraint failed
      return "Related record not found";

    case "P2014":
      // Required relation violation
      return "Required relation missing";

    default:
      return "Database operation failed";
  }
};

/**
 * Transform response data for frontend consistency
 * Converts enum values from UPPERCASE to lowercase to match frontend
 *
 * @param {*} data - Data to transform
 * @returns {*} Transformed data
 */
const transformForFrontend = (data) => {
  if (!data) return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => transformForFrontend(item));
  }

  // Handle objects
  if (typeof data === "object" && data !== null) {
    const transformed = {};

    for (const [key, value] of Object.entries(data)) {
      // Convert enum fields to lowercase
      if (key === "status" || key === "network" || key === "role") {
        transformed[key] =
          typeof value === "string" ? value.toLowerCase() : value;
      }
      // Recursively transform nested objects
      else if (typeof value === "object" && value !== null) {
        transformed[key] = transformForFrontend(value);
      }
      // Keep other values as-is
      else {
        transformed[key] = value;
      }
    }

    return transformed;
  }

  return data;
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  rateLimitResponse,
  internalErrorResponse,
  formatZodErrors,
  formatPrismaError,
  transformForFrontend,
};
