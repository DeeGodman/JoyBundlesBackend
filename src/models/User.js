// ===================================
// USER MODEL
// ===================================
// Mongoose model for User collection

const mongoose = require('mongoose');
const { UserRole, UserStatus } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^0[2-5]\d{8}$/, 'Please provide a valid Ghana phone number (0XXXXXXXXX)'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },

    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: 'Role must be either ADMIN or RESELLER',
      },
      default: UserRole.RESELLER,
      required: true,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: 'Status must be PENDING, ACTIVE, SUSPENDED, or REJECTED',
      },
      default: UserStatus.PENDING,
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===================================
// INDEXES
// ===================================

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// ===================================
// VIRTUALS
// ===================================

// Virtual for reseller profile (populated from Reseller model)
userSchema.virtual('reseller', {
  ref: 'Reseller',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

// Virtual for refresh tokens
userSchema.virtual('refreshTokens', {
  ref: 'RefreshToken',
  localField: '_id',
  foreignField: 'userId',
});

// Virtual for password resets
userSchema.virtual('passwordResets', {
  ref: 'PasswordReset',
  localField: '_id',
  foreignField: 'userId',
});

// Virtual for approved resellers (if user is admin)
userSchema.virtual('approvedResellers', {
  ref: 'Reseller',
  localField: '_id',
  foreignField: 'approvedById',
});

// ===================================
// INSTANCE METHODS
// ===================================

/**
 * Remove sensitive fields from user object
 * @returns {Object} Sanitized user object
 */
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

/**
 * Check if user is active
 * @returns {boolean}
 */
userSchema.methods.isActive = function () {
  return this.status === UserStatus.ACTIVE;
};

/**
 * Check if user is pending approval
 * @returns {boolean}
 */
userSchema.methods.isPending = function () {
  return this.status === UserStatus.PENDING;
};

/**
 * Check if user is suspended
 * @returns {boolean}
 */
userSchema.methods.isSuspended = function () {
  return this.status === UserStatus.SUSPENDED;
};

/**
 * Check if user is admin
 * @returns {boolean}
 */
userSchema.methods.isAdmin = function () {
  return this.role === UserRole.ADMIN;
};

/**
 * Check if user is reseller
 * @returns {boolean}
 */
userSchema.methods.isReseller = function () {
  return this.role === UserRole.RESELLER;
};

/**
 * Update last login timestamp
 * @returns {Promise<User>}
 */
userSchema.methods.updateLastLogin = async function () {
  this.lastLoginAt = new Date();
  return await this.save();
};

// ===================================
// STATIC METHODS
// ===================================

/**
 * Find user by email (including password)
 * @param {string} email - User email
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Find all active users
 * @returns {Promise<User[]>}
 */
userSchema.statics.findActive = function () {
  return this.find({ status: UserStatus.ACTIVE });
};

/**
 * Find all pending users
 * @returns {Promise<User[]>}
 */
userSchema.statics.findPending = function () {
  return this.find({ status: UserStatus.PENDING });
};

/**
 * Find all users by role
 * @param {string} role - User role
 * @returns {Promise<User[]>}
 */
userSchema.statics.findByRole = function (role) {
  return this.find({ role });
};

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>}
 */
userSchema.statics.emailExists = async function (email) {
  const count = await this.countDocuments({ email: email.toLowerCase() });
  return count > 0;
};

/**
 * Check if phone exists
 * @param {string} phone - Phone to check
 * @returns {Promise<boolean>}
 */
userSchema.statics.phoneExists = async function (phone) {
  const count = await this.countDocuments({ phone });
  return count > 0;
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

/**
 * Pre-save middleware
 * - Normalize email to lowercase
 * - Trim whitespace
 */
userSchema.pre('save', function (next) {
  // Normalize email
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }

  // Trim name
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }

  // Trim phone
  if (this.isModified('phone')) {
    this.phone = this.phone.trim();
  }

  next();
});

/**
 * Pre-findOneAndUpdate middleware
 * - Normalize email if being updated
 */
userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();

  if (update.email) {
    update.email = update.email.toLowerCase().trim();
  }

  if (update.name) {
    update.name = update.name.trim();
  }

  if (update.phone) {
    update.phone = update.phone.trim();
  }

  next();
});

/**
 * Post-save middleware
 * - Log user creation in development
 */
userSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ User saved: ${doc.email} (${doc.role})`);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const User = mongoose.model('User', userSchema);

module.exports = User;
