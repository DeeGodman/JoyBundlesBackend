// AUTHENTICATION CONTROLLER
// Handles HTTP requests for authentication operations

const authService = require("../services/auth.service");
const {
  successResponse,
  createdResponse,
  transformForFrontend,
} = require("../utils/response.util");
const { HttpStatus } = require("../constants");

/**
 * Register new reseller
 * POST /api/v1/auth/register
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.validatedData;

    const result = await authService.register({
      name,
      email,
      phone,
      password,
    });

    // Transform enum values to lowercase for frontend
    const transformedData = transformForFrontend(result.user);

    return createdResponse(res, transformedData, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;

    const result = await authService.login(email, password);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(result.user);

    return successResponse(
      res,
      {
        user: transformedUser,
        tokens: result.tokens,
      },
      result.message,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error = new Error("Refresh token is required");
      error.statusCode = HttpStatus.BAD_REQUEST;
      throw error;
    }

    const result = await authService.refreshAccessToken(refreshToken);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(result.user);

    return successResponse(
      res,
      {
        user: transformedUser,
        tokens: result.tokens,
      },
      result.message,
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { refreshToken } = req.body;

    const result = await authService.logout(userId, refreshToken);

    return successResponse(res, null, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 * GET /api/v1/auth/me
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await authService.getCurrentUser(userId);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(user);

    return successResponse(res, transformedUser, "User retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email (placeholder for future implementation)
 * POST /api/v1/auth/verify-email
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    return successResponse(res, null, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset (placeholder for future implementation)
 * POST /api/v1/auth/forgot-password
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    return successResponse(res, null, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password (placeholder for future implementation)
 * POST /api/v1/auth/reset-password
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    return successResponse(res, null, result.message);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
