// AUTHENTICATION MIDDLEWARE
// JWT verification and role-based authorization

const {
  verifyAccessToken,
  extractTokenFromHeader,
} = require("../utils/jwt.util");
const {
  unauthorizedResponse,
  forbiddenResponse,
} = require("../utils/response.util");
const { ErrorMessages, UserRole } = require("../constants");
const { prisma } = require("../config/database");

/**
 * Authenticate middleware
 * Verifies JWT token and attaches user to request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return unauthorizedResponse(res, ErrorMessages.UNAUTHORIZED);
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return unauthorizedResponse(res, error.message);
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        reseller: {
          select: {
            id: true,
            resellerId: true,
            referralCode: true,
          },
        },
      },
    });

    if (!user) {
      return unauthorizedResponse(res, ErrorMessages.USER_NOT_FOUND);
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      if (user.status === "PENDING") {
        return unauthorizedResponse(res, ErrorMessages.USER_PENDING_APPROVAL);
      }
      if (user.status === "SUSPENDED") {
        return unauthorizedResponse(res, ErrorMessages.USER_SUSPENDED);
      }
      if (user.status === "REJECTED") {
        return unauthorizedResponse(res, ErrorMessages.USER_REJECTED);
      }
      return unauthorizedResponse(res, ErrorMessages.USER_NOT_ACTIVE);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return unauthorizedResponse(res, ErrorMessages.UNAUTHORIZED);
  }
};

/**
 * Authorize middleware - Check user role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/admin/users', authenticate, authorize(['ADMIN']), userController.getAll);
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, ErrorMessages.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return forbiddenResponse(res, ErrorMessages.FORBIDDEN);
    }

    next();
  };
};

/**
 * Admin only middleware
 * Shortcut for authorize(['ADMIN'])
 */
const adminOnly = authorize([UserRole.ADMIN]);

/**
 * Reseller only middleware
 * Shortcut for authorize(['RESELLER'])
 */
const resellerOnly = authorize([UserRole.RESELLER]);

/**
 * Admin or Reseller middleware
 * Allows both roles
 */
const adminOrReseller = authorize([UserRole.ADMIN, UserRole.RESELLER]);

/**
 * Optional authentication middleware
 * Attaches user if token is provided, but doesn't require it
 * Useful for endpoints that work differently for authenticated vs anonymous users
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    // Try to verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      // Invalid token, continue without user
      return next();
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (user && user.status === "ACTIVE") {
      req.user = user;
    }

    next();
  } catch (error) {
    // On any error, just continue without user
    next();
  }
};

/**
 * Check if authenticated user owns the resource
 * @param {Function} getResourceUserId - Function to extract user ID from resource
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/reseller/earnings', authenticate, isOwner(
 *   async (req) => {
 *     const reseller = await prisma.reseller.findUnique({ where: { id: req.params.id } });
 *     return reseller.userId;
 *   }
 * ), resellerController.getEarnings);
 */
const isOwner = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorizedResponse(res, ErrorMessages.UNAUTHORIZED);
      }

      // Admins can access any resource
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      // Get the user ID that owns the resource
      const resourceUserId = await getResourceUserId(req);

      if (!resourceUserId) {
        return forbiddenResponse(res, "Resource not found");
      }

      // Check if current user owns the resource
      if (req.user.id !== resourceUserId) {
        return forbiddenResponse(res, "You can only access your own resources");
      }

      next();
    } catch (error) {
      console.error("Ownership check error:", error);
      return forbiddenResponse(res, ErrorMessages.FORBIDDEN);
    }
  };
};

/**
 * Rate limit by user
 * Track requests per user (requires authentication)
 *
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware function
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip if not authenticated
    }

    const userId = req.user.id;
    const now = Date.now();

    // Get user's request history
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);

    // Remove old requests outside the window
    const recentRequests = requests.filter((time) => now - time < windowMs);
    userRequests.set(userId, recentRequests);

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000),
      });
    }

    // Add current request
    recentRequests.push(now);
    userRequests.set(userId, recentRequests);

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  adminOnly,
  resellerOnly,
  adminOrReseller,
  optionalAuth,
  isOwner,
  rateLimitByUser,
};
