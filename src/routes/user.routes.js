// USER MANAGEMENT ROUTES
// Routes for user CRUD operations and reseller management

const express = require("express");
const router = express.Router();

// Controllers
const userController = require("../controllers/user.controller");

// Middleware
const {
  authenticate,
  adminOnly,
  authorize,
} = require("../middleware/auth.middleware");
const {
  validate,
  validateParams,
} = require("../middleware/validation.middleware");
const { generalLimiter } = require("../middleware/rateLimiter.middleware");

// Validators
const { updateUserSchema, uuidSchema } = require("../utils/validators");

// Apply general rate limiting to all user routes
router.use(generalLimiter);

// All user routes require authentication
router.use(authenticate);

// RESELLER MANAGEMENT ROUTES (Admin only)
/**
 * @route   GET /api/v1/users/resellers
 * @desc    Get all resellers with filters and pagination
 * @access  Private (Admin only)
 * @query   ?status=PENDING&search=name&page=1&limit=20
 */
router.get("/resellers", adminOnly, userController.getAllResellers);

/**
 * @route   POST /api/v1/users/:id/approve
 * @desc    Approve pending reseller application
 * @access  Private (Admin only)
 * @params  id - User ID
 */
router.post(
  "/:id/approve",
  adminOnly,
  validateParams(uuidSchema),
  userController.approveReseller,
);

/**
 * @route   POST /api/v1/users/:id/reject
 * @desc    Reject reseller application with reason
 * @access  Private (Admin only)
 * @params  id - User ID
 * @body    { reason }
 */
router.post(
  "/:id/reject",
  adminOnly,
  validateParams(uuidSchema),
  userController.rejectReseller,
);

/**
 * @route   POST /api/v1/users/:id/suspend
 * @desc    Suspend user account
 * @access  Private (Admin only)
 * @params  id - User ID
 */
router.post(
  "/:id/suspend",
  adminOnly,
  validateParams(uuidSchema),
  userController.suspendUser,
);

/**
 * @route   POST /api/v1/users/:id/activate
 * @desc    Activate suspended user account
 * @access  Private (Admin only)
 * @params  id - User ID
 */
router.post(
  "/:id/activate",
  adminOnly,
  validateParams(uuidSchema),
  userController.activateUser,
);

// USER CRUD ROUTES
/**
 * @route   GET /api/v1/users
 * @desc    Get all users with filters and pagination
 * @access  Private (Admin only)
 * @query   ?role=ADMIN&status=ACTIVE&search=email&page=1&limit=20
 */
router.get("/", adminOnly, userController.getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin can view any, users can view self)
 * @params  id - User ID
 */
router.get("/:id", validateParams(uuidSchema), userController.getUserById);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user profile
 * @access  Private (Admin can update any, users can update self)
 * @params  id - User ID
 * @body    { name?, phone?, email?, password? }
 */
router.put(
  "/:id",
  validateParams(uuidSchema),
  validate(updateUserSchema),
  userController.updateUser,
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete (soft delete/suspend) user
 * @access  Private (Admin only)
 * @params  id - User ID
 */
router.delete(
  "/:id",
  adminOnly,
  validateParams(uuidSchema),
  userController.deleteUser,
);

module.exports = router;
