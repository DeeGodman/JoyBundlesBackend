// USER SERVICE
// Business logic for user management operations
const { User, Reseller } = require("../models");
const { hashPassword } = require("../utils/password.util");
const { sanitizeUser } = require("../utils/helpers");
const { createError } = require("../middleware/error.middleware");
const {
  HttpStatus,
  ErrorMessages,
  SuccessMessages,
  UserRole,
  UserStatus,
} = require("../constants");

/**
 * Get user by ID
 * Admin can view any user, resellers can only view themselves
 *
 * @param {string} userId - User ID to retrieve
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} User data
 */
const getUserById = async (userId, requestingUser) => {
  try {
    // Check authorization
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.id !== userId
    ) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    const user = await User.findById(userId).populate("reseller");

    if (!user) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return sanitizeUser(user);
  } catch (error) {
    console.error("Get user by ID error:", error);
    throw error;
  }
};

/**
 * Get all users with filters
 * Admin only - with pagination and filtering
 *
 * @param {Object} filters - Filter options
 * @param {string} filters.role - Filter by role (ADMIN, RESELLER)
 * @param {string} filters.status - Filter by status (PENDING, ACTIVE, SUSPENDED, REJECTED)
 * @param {string} filters.search - Search by name, email, or phone
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 20)
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Users list with pagination
 */
const getAllUsers = async (filters = {}, requestingUser) => {
  try {
    // Only admins can view all users
    if (requestingUser.role !== UserRole.ADMIN) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    const {
      role,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    // Build where clause
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await User.find(where)
      .skip(skip)
      .limit(take)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .populate("reseller");

    // Sanitize users (remove passwords)
    const sanitizedUsers = users.map((user) => sanitizeUser(user));

    return {
      users: sanitizedUsers,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
        hasMore: skip + users.length < total,
      },
    };
  } catch (error) {
    console.error("Get all users error:", error);
    throw error;
  }
};

/**
 * Get all resellers (for admin dashboard)
 * Admin only - returns only users with RESELLER role
 *
 * @param {Object} filters - Filter options
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Resellers list
 */
const getAllResellers = async (filters = {}, requestingUser) => {
  try {
    // Only admins can view all resellers
    if (requestingUser.role !== UserRole.ADMIN) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    return await getAllUsers(
      {
        ...filters,
        role: UserRole.RESELLER,
      },
      requestingUser,
    );
  } catch (error) {
    console.error("Get all resellers error:", error);
    throw error;
  }
};

/**
 * Update user profile
 * Users can update their own profile, admins can update any profile
 *
 * @param {string} userId - User ID to update
 * @param {Object} updates - Fields to update
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Updated user data
 */
const updateUser = async (userId, updates, requestingUser) => {
  try {
    // Check authorization
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.id !== userId
    ) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // Fields that can be updated
    const allowedUpdates = ["name", "phone"];
    const adminOnlyUpdates = ["email", "role", "status"];

    // Build update data
    const updateData = {};

    // Regular users can update limited fields
    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Admins can update additional fields
    if (requestingUser.role === UserRole.ADMIN) {
      for (const field of adminOnlyUpdates) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      // Normalize email if updating
      if (updateData.email) {
        updateData.email = updateData.email.toLowerCase();
      }
    }

    // Handle password update separately
    if (updates.password && requestingUser.id === userId) {
      // Users can only update their own password
      updateData.password = await hashPassword(updates.password);
    }

    // Check for duplicate email or phone if updating
    if (updateData.email || updateData.phone) {
      const duplicate = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                updateData.email ? { email: updateData.email } : {},
                updateData.phone ? { phone: updateData.phone } : {},
              ].filter((obj) => Object.keys(obj).length > 0),
            },
          ],
        },
      });

      if (duplicate) {
        if (duplicate.email === updateData.email) {
          throw createError(
            "Email already in use by another user",
            HttpStatus.CONFLICT,
          );
        }
        if (duplicate.phone === updateData.phone) {
          throw createError(
            "Phone number already in use by another user",
            HttpStatus.CONFLICT,
          );
        }
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).populate("reseller");

    return {
      user: sanitizeUser(updatedUser),
      message: SuccessMessages.USER_UPDATED,
    };
  } catch (error) {
    console.error("Update user error:", error);
    throw error;
  }
};

/**
 * Delete user
 * Admin only - soft delete by setting status to SUSPENDED
 *
 * @param {string} userId - User ID to delete
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Success message
 */
const deleteUser = async (userId, requestingUser) => {
  try {
    // Only admins can delete users
    if (requestingUser.role !== UserRole.ADMIN) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // Prevent deleting own account
    if (userId === requestingUser.id) {
      throw createError(
        "You cannot delete your own account",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Soft delete: Set status to SUSPENDED
    await User.findByIdAndUpdate(userId, {
      status: UserStatus.SUSPENDED,
    });

    // Optionally, invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return {
      message: SuccessMessages.USER_DELETED,
    };
  } catch (error) {
    console.error("Delete user error:", error);
    throw error;
  }
};

/**
 * Approve reseller
 * Admin only - activates pending reseller account
 *
 * @param {string} userId - User ID to approve
 * @param {Object} requestingUser - User making the request (admin)
 * @returns {Promise<Object>} Updated user data
 */
const approveReseller = async (userId, requestingUser) => {
  try {
    // Only admins can approve resellers
    if (requestingUser.role !== UserRole.ADMIN) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user exists and is a reseller

    if (!user) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user.role !== UserRole.RESELLER) {
      throw createError("User is not a reseller", HttpStatus.BAD_REQUEST);
    }

    if (user.status === UserStatus.ACTIVE) {
      throw createError("Reseller is already approved", HttpStatus.BAD_REQUEST);
    }

    // Update user status and reseller approval
    const user = await User.findById(userId);
    user.status = UserStatus.ACTIVE;
    await user.save();
    const reseller = await Reseller.findOne({ userId });
    await reseller.approve(requestingUser.id);

    await user.populate("reseller");

    return {
      user: sanitizeUser(updatedUser),
      message: SuccessMessages.RESELLER_APPROVED,
    };
  } catch (error) {
    console.error("Approve reseller error:", error);
    throw error;
  }
};

/**
 * Reject reseller
 * Admin only - rejects pending reseller application
 *
 * @param {string} userId - User ID to reject
 * @param {string} reason - Rejection reason
 * @param {Object} requestingUser - User making the request (admin)
 * @returns {Promise<Object>} Updated user data
 */
const rejectReseller = async (userId, reason, requestingUser) => {
  try {
    // Only admins can reject resellers
    if (requestingUser.role !== UserRole.ADMIN) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user exists and is a reseller
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reseller: true,
      },
    });

    if (!user) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user.role !== UserRole.RESELLER) {
      throw createError("User is not a reseller", HttpStatus.BAD_REQUEST);
    }

    if (user.status === UserStatus.REJECTED) {
      throw createError("Reseller is already rejected", HttpStatus.BAD_REQUEST);
    }

    // Update user status and add rejection reason
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.REJECTED,
        reseller: {
          update: {
            rejectionReason: reason,
            approvedById: null,
            approvedAt: null,
          },
        },
      },
      include: {
        reseller: {
          select: {
            id: true,
            resellerId: true,
            referralCode: true,
            rejectionReason: true,
          },
        },
      },
    });

    return {
      user: sanitizeUser(updatedUser),
      message: SuccessMessages.RESELLER_REJECTED,
    };
  } catch (error) {
    console.error("Reject reseller error:", error);
    throw error;
  }
};

/**
 * Suspend user
 * Admin only - suspends an active user
 *
 * @param {string} userId - User ID to suspend
 * @param {Object} requestingUser - User making the request (admin)
 * @returns {Promise<Object>} Updated user data
 */
const suspendUser = async (userId, requestingUser) => {
  try {
    // Only admins can suspend users
    if (requestingUser.role !== UserRole.ADMIN) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    // Prevent suspending own account
    if (userId === requestingUser.id) {
      throw createError(
        "You cannot suspend your own account",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw createError("User is already suspended", HttpStatus.BAD_REQUEST);
    }

    // Update user status to SUSPENDED
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
      },
      include: {
        reseller: {
          select: {
            id: true,
            resellerId: true,
            referralCode: true,
          },
        },
      },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return {
      user: sanitizeUser(updatedUser),
      message: SuccessMessages.USER_SUSPENDED,
    };
  } catch (error) {
    console.error("Suspend user error:", error);
    throw error;
  }
};

/**
 * Activate user
 * Admin only - activates a suspended user
 *
 * @param {string} userId - User ID to activate
 * @param {Object} requestingUser - User making the request (admin)
 * @returns {Promise<Object>} Updated user data
 */
const activateUser = async (userId, requestingUser) => {
  try {
    // Only admins can activate users
    if (requestingUser.role !== UserRole.ADMIN) {
      throw createError(
        ErrorMessages.UNAUTHORIZED_ACCESS,
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError(ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user.status === UserStatus.ACTIVE) {
      throw createError("User is already active", HttpStatus.BAD_REQUEST);
    }

    // Only allow activating SUSPENDED users
    if (user.status !== UserStatus.SUSPENDED) {
      throw createError(
        "Only suspended users can be activated",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update user status to ACTIVE
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
      },
      include: {
        reseller: {
          select: {
            id: true,
            resellerId: true,
            referralCode: true,
          },
        },
      },
    });

    return {
      user: sanitizeUser(updatedUser),
      message: SuccessMessages.USER_ACTIVATED,
    };
  } catch (error) {
    console.error("Activate user error:", error);
    throw error;
  }
};

module.exports = {
  getUserById,
  getAllUsers,
  getAllResellers,
  updateUser,
  deleteUser,
  approveReseller,
  rejectReseller,
  suspendUser,
  activateUser,
};
