// AUTHENTICATION SERVICE
// Business logic for authentication operations

const { User, Reseller, RefreshToken } = require("../models");
const { hashPassword, comparePassword } = require("../utils/password.util");
const { generateTokens, verifyRefreshToken } = require("../utils/jwt.util");
const {
  generateResellerId,
  generateReferralCode,
  sanitizeUser,
} = require("../utils/helpers");
const { createError } = require("../middleware/error.middleware");
const {
  HttpStatus,
  ErrorMessages,
  SuccessMessages,
  UserRole,
  UserStatus,
} = require("../constants");

/**
 * Register new reseller
 * Creates user with PENDING status awaiting admin approval
 */
const register = async ({ name, email, phone, password }) => {
  try {
    // Check if user already exists
    // Mongoose: Use findOne with $or operator
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw createError(
          "A user with this email already exists",
          HttpStatus.CONFLICT,
        );
      }
      if (existingUser.phone === phone) {
        throw createError(
          "A user with this phone number already exists",
          HttpStatus.CONFLICT,
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get current reseller count to generate ID
    // REPLACEMENT: prisma.reseller.count() -> Reseller.countDocuments()
    const resellerCount = await Reseller.countDocuments();

    // Generate unique reseller ID and referral code
    const resellerId = generateResellerId(resellerCount);
    const referralCode = generateReferralCode();

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: UserRole.RESELLER,
      status: UserStatus.PENDING,
    });

    // Create reseller profile linked to user
    const reseller = await Reseller.create({
      userId: user._id,
      resellerId,
      referralCode,
      pricingMode: "PRESET",
      presetCommission: 5.0,
    });

    // Populate reseller virtual field for response
    await user.populate("reseller");

    // Remove password from response
    const userResponse = sanitizeUser(user.toObject());

    return {
      user: userResponse,
      message: SuccessMessages.REGISTER_SUCCESS,
    };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

/**
 * Login user
 * Authenticates user and returns JWT tokens
 */
const login = async (email, password) => {
  try {
    // Find user by email
    // REPLACEMENT: prisma.user.findUnique -> User.findByEmailWithPassword (Static method)
    const user = await User.findByEmailWithPassword(email).populate("reseller");

    if (!user) {
      throw createError(
        ErrorMessages.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw createError(
        ErrorMessages.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check user status using Mongoose instance methods
    if (user.isPending()) {
      throw createError(
        ErrorMessages.USER_PENDING_APPROVAL,
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.isSuspended()) {
      throw createError(ErrorMessages.USER_SUSPENDED, HttpStatus.FORBIDDEN);
    }

    // user.status check covers REJECTED and other states
    if (!user.isActive()) {
      if (user.status === UserStatus.REJECTED) {
        throw createError(ErrorMessages.USER_REJECTED, HttpStatus.FORBIDDEN);
      }
      throw createError(ErrorMessages.USER_NOT_ACTIVE, HttpStatus.FORBIDDEN);
    }

    // Generate JWT tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token to database
    // REPLACEMENT: prisma.refreshToken.create -> RefreshToken.create
    await RefreshToken.create({
      userId: user._id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Update last login time
    // REPLACEMENT: prisma.user.update -> user.updateLastLogin() (Instance method)
    await user.updateLastLogin();

    // Remove password from response
    const userResponse = sanitizeUser(user.toObject());

    return {
      user: userResponse,
      tokens,
      message: SuccessMessages.LOGIN_SUCCESS,
    };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Refresh access token
 * Generates new access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw createError(error.message, HttpStatus.UNAUTHORIZED);
    }

    // Check if refresh token exists in database
    // REPLACEMENT: prisma.refreshToken.findUnique -> RefreshToken.findOne
    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
    }).populate({
      path: "user",
      populate: { path: "reseller" },
    });

    if (!storedToken) {
      throw createError(ErrorMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
    }

    // Check if token is expired (using instance method)
    if (storedToken.isExpired()) {
      // Delete expired token
      // REPLACEMENT: prisma.refreshToken.delete -> storedToken.deleteOne()
      await storedToken.deleteOne();
      throw createError(ErrorMessages.TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED);
    }

    const user = storedToken.user;

    // Check if user is still active
    if (user.status !== UserStatus.ACTIVE) {
      throw createError(ErrorMessages.USER_NOT_ACTIVE, HttpStatus.FORBIDDEN);
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Delete old refresh token
    // REPLACEMENT: prisma.refreshToken.delete -> deleteOne
    await RefreshToken.deleteOne({ token: refreshToken });

    // Save new refresh token
    await RefreshToken.create({
      userId: user._id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Remove password from user response
    const userResponse = sanitizeUser(user.toObject());

    return {
      user: userResponse,
      tokens,
      message: SuccessMessages.TOKEN_REFRESHED,
    };
  } catch (error) {
    console.error("Refresh token error:", error);
    throw error;
  }
};

/**
 * Logout user
 * Invalidates refresh token
 */
const logout = async (userId, refreshToken = null) => {
  try {
    if (refreshToken) {
      // Delete specific refresh token
      // REPLACEMENT: prisma.refreshToken.deleteMany -> RefreshToken.deleteMany
      await RefreshToken.deleteMany({
        userId,
        token: refreshToken,
      });
    } else {
      // Delete all refresh tokens for user
      await RefreshToken.deleteMany({ userId });
    }

    return {
      message: SuccessMessages.LOGOUT_SUCCESS,
    };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

/**
 * Get current user
 * Returns user data for authenticated user
 */
const getCurrentUser = async (userId) => {
  try {
    // REPLACEMENT: prisma.user.findUnique -> User.findById
    const user = await User.findById(userId).populate("reseller");

    if (!user) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // Remove password from response
    const userResponse = sanitizeUser(user.toObject());

    return userResponse;
  } catch (error) {
    console.error("Get current user error:", error);
    throw error;
  }
};

/**
 * Verify email (for future implementation)
 */
const verifyEmail = async (token) => {
  throw createError(
    "Email verification not implemented yet",
    HttpStatus.NOT_IMPLEMENTED,
  );
};

/**
 * Request password reset (for future implementation)
 */
const requestPasswordReset = async (email) => {
  throw createError(
    "Password reset not implemented yet",
    HttpStatus.NOT_IMPLEMENTED,
  );
};

/**
 * Reset password (for future implementation)
 */
const resetPassword = async (token, newPassword) => {
  throw createError(
    "Password reset not implemented yet",
    HttpStatus.NOT_IMPLEMENTED,
  );
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
};
