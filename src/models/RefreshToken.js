// ===================================
// REFRESH TOKEN MODEL
// ===================================
// Mongoose model for RefreshToken collection

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===================================
// INDEXES
// ===================================

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
refreshTokenSchema.index({ createdAt: -1 });

// Compound index for efficient queries
refreshTokenSchema.index({ userId: 1, token: 1 });

// TTL index - automatically delete expired tokens after they expire
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ===================================
// VIRTUALS
// ===================================

// Virtual for user relationship
refreshTokenSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// ===================================
// INSTANCE METHODS
// ===================================

/**
 * Check if token is expired
 * @returns {boolean}
 */
refreshTokenSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

/**
 * Check if token is valid (not expired)
 * @returns {boolean}
 */
refreshTokenSchema.methods.isValid = function () {
  return !this.isExpired();
};

/**
 * Get remaining time in seconds
 * @returns {number}
 */
refreshTokenSchema.methods.getRemainingTime = function () {
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.floor(diff / 1000));
};

/**
 * Get remaining time in days
 * @returns {number}
 */
refreshTokenSchema.methods.getRemainingDays = function () {
  const seconds = this.getRemainingTime();
  return Math.floor(seconds / (60 * 60 * 24));
};

// ===================================
// STATIC METHODS
// ===================================

/**
 * Find token by token string
 * @param {string} token - Token string
 * @returns {Promise<RefreshToken|null>}
 */
refreshTokenSchema.statics.findByToken = function (token) {
  return this.findOne({ token }).populate('user');
};

/**
 * Find all tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<RefreshToken[]>}
 */
refreshTokenSchema.statics.findByUserId = function (userId) {
  return this.find({ userId });
};

/**
 * Delete all tokens for a user (logout from all devices)
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.deleteByUserId = function (userId) {
  return this.deleteMany({ userId });
};

/**
 * Delete specific token
 * @param {string} token - Token string
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.deleteByToken = function (token) {
  return this.deleteOne({ token });
};

/**
 * Delete expired tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.deleteExpiredByUserId = async function (userId) {
  return this.deleteMany({
    userId,
    expiresAt: { $lt: new Date() },
  });
};

/**
 * Delete all expired tokens (cleanup job)
 * @returns {Promise<Object>}
 */
refreshTokenSchema.statics.deleteAllExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`🗑️  Deleted ${result.deletedCount} expired refresh tokens`);
  }

  return result;
};

/**
 * Count active tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
refreshTokenSchema.statics.countActiveByUserId = async function (userId) {
  return this.countDocuments({
    userId,
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Check if token exists and is valid
 * @param {string} token - Token string
 * @returns {Promise<boolean>}
 */
refreshTokenSchema.statics.isValidToken = async function (token) {
  const refreshToken = await this.findOne({ token });

  if (!refreshToken) {
    return false;
  }

  return !refreshToken.isExpired();
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

/**
 * Pre-save middleware
 * - Validate expiration date is in the future
 */
refreshTokenSchema.pre('save', function (next) {
  if (this.isNew && this.expiresAt <= new Date()) {
    return next(new Error('Expiration date must be in the future'));
  }

  next();
});

/**
 * Post-save middleware
 * - Log token creation in development
 */
refreshTokenSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Refresh token created for user: ${doc.userId}`);
  }
});

/**
 * Post-remove middleware
 * - Log token deletion in development
 */
refreshTokenSchema.post('remove', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🗑️  Refresh token deleted for user: ${doc.userId}`);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
