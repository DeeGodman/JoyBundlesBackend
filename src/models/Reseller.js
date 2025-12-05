// ===================================
// RESELLER MODEL
// ===================================
// Mongoose model for Reseller collection

const mongoose = require('mongoose');
const { PricingMode } = require('../constants');

const resellerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },

    resellerId: {
      type: String,
      required: [true, 'Reseller ID is required'],
      unique: true,
      match: [/^RES-\d{3}$/, 'Reseller ID must be in format RES-XXX (e.g., RES-001)'],
    },

    referralCode: {
      type: String,
      required: [true, 'Referral code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [8, 'Referral code must be 8 characters'],
      maxlength: [8, 'Referral code must be 8 characters'],
    },

    pricingMode: {
      type: String,
      enum: {
        values: Object.values(PricingMode),
        message: 'Pricing mode must be PRESET or CUSTOM',
      },
      default: PricingMode.PRESET,
      required: true,
    },

    presetCommission: {
      type: mongoose.Schema.Types.Decimal128,
      default: 5.0,
      min: [0, 'Preset commission cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    totalSales: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
      min: [0, 'Total sales cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    totalEarnings: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
      min: [0, 'Total earnings cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    totalOrders: {
      type: Number,
      default: 0,
      min: [0, 'Total orders cannot be negative'],
    },

    approvedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
      maxlength: [500, 'Rejection reason must not exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

// ===================================
// INDEXES
// ===================================

resellerSchema.index({ userId: 1 });
resellerSchema.index({ resellerId: 1 });
resellerSchema.index({ referralCode: 1 });
resellerSchema.index({ pricingMode: 1 });
resellerSchema.index({ approvedById: 1 });
resellerSchema.index({ createdAt: -1 });

// ===================================
// VIRTUALS
// ===================================

// Virtual for user relationship
resellerSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for approvedBy relationship
resellerSchema.virtual('approvedBy', {
  ref: 'User',
  localField: 'approvedById',
  foreignField: '_id',
  justOne: true,
});

// Virtual for orders
resellerSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'resellerId',
});

// Virtual for pricing
resellerSchema.virtual('pricing', {
  ref: 'ResellerPricing',
  localField: '_id',
  foreignField: 'resellerId',
});

// Virtual for withdrawals
resellerSchema.virtual('withdrawals', {
  ref: 'Withdrawal',
  localField: '_id',
  foreignField: 'resellerId',
});

// ===================================
// INSTANCE METHODS
// ===================================

/**
 * Check if reseller is approved
 * @returns {boolean}
 */
resellerSchema.methods.isApproved = function () {
  return this.approvedAt !== null && this.approvedById !== null;
};

/**
 * Check if reseller uses preset pricing
 * @returns {boolean}
 */
resellerSchema.methods.usesPresetPricing = function () {
  return this.pricingMode === PricingMode.PRESET;
};

/**
 * Check if reseller uses custom pricing
 * @returns {boolean}
 */
resellerSchema.methods.usesCustomPricing = function () {
  return this.pricingMode === PricingMode.CUSTOM;
};

/**
 * Add to total sales
 * @param {number} amount - Amount to add
 * @returns {Promise<Reseller>}
 */
resellerSchema.methods.addSale = async function (amount) {
  const currentSales = parseFloat(this.totalSales.toString());
  this.totalSales = mongoose.Types.Decimal128.fromString((currentSales + amount).toFixed(2));
  this.totalOrders += 1;
  return await this.save();
};

/**
 * Add to total earnings
 * @param {number} amount - Amount to add
 * @returns {Promise<Reseller>}
 */
resellerSchema.methods.addEarnings = async function (amount) {
  const currentEarnings = parseFloat(this.totalEarnings.toString());
  this.totalEarnings = mongoose.Types.Decimal128.fromString((currentEarnings + amount).toFixed(2));
  return await this.save();
};

/**
 * Get available balance (for withdrawals)
 * @returns {number}
 */
resellerSchema.methods.getAvailableBalance = function () {
  return parseFloat(this.totalEarnings.toString());
};

/**
 * Mark as approved
 * @param {string} adminId - Admin user ID who approved
 * @returns {Promise<Reseller>}
 */
resellerSchema.methods.approve = async function (adminId) {
  this.approvedById = adminId;
  this.approvedAt = new Date();
  this.rejectionReason = null;
  return await this.save();
};

/**
 * Mark as rejected
 * @param {string} reason - Rejection reason
 * @returns {Promise<Reseller>}
 */
resellerSchema.methods.reject = async function (reason) {
  this.rejectionReason = reason;
  this.approvedById = null;
  this.approvedAt = null;
  return await this.save();
};

// ===================================
// STATIC METHODS
// ===================================

/**
 * Find reseller by reseller ID
 * @param {string} resellerId - Reseller ID (e.g., RES-001)
 * @returns {Promise<Reseller|null>}
 */
resellerSchema.statics.findByResellerId = function (resellerId) {
  return this.findOne({ resellerId });
};

/**
 * Find reseller by referral code
 * @param {string} referralCode - Referral code
 * @returns {Promise<Reseller|null>}
 */
resellerSchema.statics.findByReferralCode = function (referralCode) {
  return this.findOne({ referralCode: referralCode.toUpperCase() });
};

/**
 * Find reseller by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Reseller|null>}
 */
resellerSchema.statics.findByUserId = function (userId) {
  return this.findOne({ userId });
};

/**
 * Get all approved resellers
 * @returns {Promise<Reseller[]>}
 */
resellerSchema.statics.findApproved = function () {
  return this.find({ approvedAt: { $ne: null } });
};

/**
 * Get all unapproved resellers
 * @returns {Promise<Reseller[]>}
 */
resellerSchema.statics.findUnapproved = function () {
  return this.find({ approvedAt: null, rejectionReason: null });
};

/**
 * Get all rejected resellers
 * @returns {Promise<Reseller[]>}
 */
resellerSchema.statics.findRejected = function () {
  return this.find({ rejectionReason: { $ne: null } });
};

/**
 * Check if reseller ID exists
 * @param {string} resellerId - Reseller ID to check
 * @returns {Promise<boolean>}
 */
resellerSchema.statics.resellerIdExists = async function (resellerId) {
  const count = await this.countDocuments({ resellerId });
  return count > 0;
};

/**
 * Check if referral code exists
 * @param {string} referralCode - Referral code to check
 * @returns {Promise<boolean>}
 */
resellerSchema.statics.referralCodeExists = async function (referralCode) {
  const count = await this.countDocuments({ referralCode: referralCode.toUpperCase() });
  return count > 0;
};

/**
 * Get next reseller ID number
 * @returns {Promise<string>}
 */
resellerSchema.statics.getNextResellerId = async function () {
  const count = await this.countDocuments();
  const nextNumber = (count + 1).toString().padStart(3, '0');
  return `RES-${nextNumber}`;
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

/**
 * Pre-save middleware
 * - Normalize referral code to uppercase
 */
resellerSchema.pre('save', function (next) {
  if (this.isModified('referralCode')) {
    this.referralCode = this.referralCode.toUpperCase().trim();
  }

  next();
});

/**
 * Post-save middleware
 * - Log reseller creation in development
 */
resellerSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Reseller saved: ${doc.resellerId} (${doc.referralCode})`);
  }
});

/**
 * Pre-remove middleware
 * - Clean up related data when reseller is deleted
 */
resellerSchema.pre('remove', async function (next) {
  try {
    // Delete related reseller pricing
    await mongoose.model('ResellerPricing').deleteMany({ resellerId: this._id });

    // Note: Orders are kept for record-keeping
    // Note: Withdrawals are kept for record-keeping

    console.log(`🗑️  Cleaned up data for reseller: ${this.resellerId}`);
    next();
  } catch (error) {
    next(error);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const Reseller = mongoose.model('Reseller', resellerSchema);

module.exports = Reseller;
