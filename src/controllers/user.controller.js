// USER CONTROLLER
// Handles HTTP requests for user management operations

const userService = require("../services/user.service");
const {
  successResponse,
  transformForFrontend,
} = require("../utils/response.util");

/**
 * Get user by ID
 * GET /api/v1/users/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    const user = await userService.getUserById(id, requestingUser);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(user);

    return successResponse(res, transformedUser, "User retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users
 * GET /api/v1/users
 * Admin only
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getAllUsers = async (req, res, next) => {
  try {
    const requestingUser = req.user;
    const filters = {
      role: req.query.role,
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await userService.getAllUsers(filters, requestingUser);

    // Transform enum values to lowercase for frontend
    const transformedUsers = result.users.map((user) =>
      transformForFrontend(user),
    );

    return successResponse(
      res,
      {
        users: transformedUsers,
        pagination: result.pagination,
      },
      "Users retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all resellers
 * GET /api/v1/users/resellers
 * Admin only
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getAllResellers = async (req, res, next) => {
  try {
    const requestingUser = req.user;
    const filters = {
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const result = await userService.getAllResellers(filters, requestingUser);

    // Transform enum values to lowercase for frontend
    const transformedResellers = result.users.map((user) =>
      transformForFrontend(user),
    );

    return successResponse(
      res,
      {
        resellers: transformedResellers,
        pagination: result.pagination,
      },
      "Resellers retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/v1/users/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const updates = req.validatedData || req.body;

    const result = await userService.updateUser(id, updates, requestingUser);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(result.user);

    return successResponse(res, transformedUser, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user
 * DELETE /api/v1/users/:id
 * Admin only
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    const result = await userService.deleteUser(id, requestingUser);

    return successResponse(res, null, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Approve reseller
 * POST /api/v1/users/:id/approve
 * Admin only
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const approveReseller = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    const result = await userService.approveReseller(id, requestingUser);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(result.user);

    return successResponse(res, transformedUser, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Reject reseller
 * POST /api/v1/users/:id/reject
 * Admin only
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const rejectReseller = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.validatedData || req.body;
    const requestingUser = req.user;

    if (!reason) {
      const error = new Error("Rejection reason is required");
      error.statusCode = 400;
      throw error;
    }

    const result = await userService.rejectReseller(
      id,
      reason,
      requestingUser,
    );

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(result.user);

    return successResponse(res, transformedUser, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend user
 * POST /api/v1/users/:id/suspend
 * Admin only
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    const result = await userService.suspendUser(id, requestingUser);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(result.user);

    return successResponse(res, transformedUser, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Activate user
 * POST /api/v1/users/:id/activate
 * Admin only
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    const result = await userService.activateUser(id, requestingUser);

    // Transform enum values to lowercase for frontend
    const transformedUser = transformForFrontend(result.user);

    return successResponse(res, transformedUser, result.message);
  } catch (error) {
    next(error);
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
