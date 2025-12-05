// JWT UTILITY
// JSON Web Token generation and verification

const jwt = require("jsonwebtoken");
const { config } = require("../config/env");
const { ErrorMessages } = require("../constants");

/**
 * Generate access token
 * @param {Object} payload - Token payload (user data)
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @param {string} payload.role - User role (ADMIN or RESELLER)
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  try {
    const token = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        type: "access",
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
        issuer: "joybundle-api",
        audience: "joybundle-client",
      },
    );

    return token;
  } catch (error) {
    console.error("Error generating access token:", error);
    throw new Error("Failed to generate access token");
  }
};

/**
 * Generate refresh token
 * @param {Object} payload - Token payload (user data)
 * @param {string} payload.userId - User ID
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(
      {
        userId: payload.userId,
        type: "refresh",
      },
      config.jwt.refreshSecret,
      {
        expiresIn: config.jwt.refreshExpiresIn,
        issuer: "joybundle-api",
        audience: "joybundle-client",
      },
    );

    return token;
  } catch (error) {
    console.error("Error generating refresh token:", error);
    throw new Error("Failed to generate refresh token");
  }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} payload - Token payload (user data)
 * @returns {Object} Object containing access and refresh tokens
 */
const generateTokens = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: "joybundle-api",
      audience: "joybundle-client",
    });

    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error(ErrorMessages.TOKEN_EXPIRED);
    }

    if (error.name === "JsonWebTokenError") {
      throw new Error(ErrorMessages.INVALID_TOKEN);
    }

    throw new Error(ErrorMessages.INVALID_TOKEN);
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: "joybundle-api",
      audience: "joybundle-client",
    });

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error(ErrorMessages.TOKEN_EXPIRED);
    }

    if (error.name === "JsonWebTokenError") {
      throw new Error(ErrorMessages.INVALID_TOKEN);
    }

    throw new Error(ErrorMessages.INVALID_TOKEN);
  }
};

/**
 * Decode token without verification (for debugging)
 * WARNING: Do not use for authentication
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }

  return expiration < new Date();
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  getTokenExpiration,
  isTokenExpired,
};
