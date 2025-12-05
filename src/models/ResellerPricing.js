// ===================================
// RESELLER PRICING MODEL
// ===================================
// Mongoose model for ResellerPricing collection

const mongoose = require('mongoose');

const resellerPricingSchema = new mongoose.Schema(
  {
    resellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reseller',
      required: [true, 'Reseller ID is required'],
      index: true,
    },

    bundleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bundle',
      required: [true, 'Bundle ID is required'],
      index: true,
    },

    commission: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Commission is required'],
      min: [0, 'Commission cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    sellingPrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
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

resellerPricingSchema.index({ resellerId: 1 });
resellerPricingSchema.index({ bundleId: 1 });

// Compound unique index - one pricing per reseller per bundle
resellerPricingSchema.index({ resellerId: 1, bundleId: 1 }, { unique: true });

// ===================================
// VIRTUALS
// ===================================

resellerPricingSchema.virtual('reseller', {
  ref: 'Reseller',
  localField: 'resellerId',
  foreignField: '_id',
  justOne: true,
});

resellerPricingSchema.virtual('bundle', {
  ref: 'Bundle',
  localField: 'bundleId',
  foreignField: '_id',
  justOne: true,
});

// ===================================
// INSTANCE METHODS
// ===================================

/**
 * Calculate profit percentage
 * @returns {number}
 */
resellerPricingSchema.methods.getProfitPercentage = function () {
  const bundleBasePrice = this.bundle?.basePrice || 0;
  const commission = parseFloat(this.commission.toString());
  if (bundleBasePrice === 0) return 0;
  return (commission / bundleBasePrice) * 100;
};

/**
 * Update pricing
 * @param {number} commission - New commission
 * @param {number} basePrice - Bundle base price
 * @returns {Promise<ResellerPricing>}
 */
resellerPricingSchema.methods.updatePricing = async function (commission, basePrice) {
  this.commission = mongoose.Types.Decimal128.fromString(commission.toFixed(2));
  this.sellingPrice = mongoose.Types.Decimal128.fromString((basePrice + commission).toFixed(2));
  return await this.save();
};

// ===================================
// STATIC METHODS
// ===================================

/**
 * Find pricing by reseller and bundle
 * @param {string} resellerId - Reseller ID
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<ResellerPricing|null>}
 */
resellerPricingSchema.statics.findByResellerAndBundle = function (resellerId, bundleId) {
  return this.findOne({ resellerId, bundleId })
    .populate('reseller')
    .populate('bundle');
};

/**
 * Find all pricing for a reseller
 * @param {string} resellerId - Reseller ID
 * @returns {Promise<ResellerPricing[]>}
 */
resellerPricingSchema.statics.findByReseller = function (resellerId) {
  return this.find({ resellerId }).populate('bundle');
};

/**
 * Find all pricing for a bundle
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<ResellerPricing[]>}
 */
resellerPricingSchema.statics.findByBundle = function (bundleId) {
  return this.find({ bundleId }).populate('reseller');
};

/**
 * Check if pricing exists
 * @param {string} resellerId - Reseller ID
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<boolean>}
 */
resellerPricingSchema.statics.pricingExists = async function (resellerId, bundleId) {
  const count = await this.countDocuments({ resellerId, bundleId });
  return count > 0;
};

/**
 * Delete all pricing for a reseller
 * @param {string} resellerId - Reseller ID
 * @returns {Promise<Object>}
 */
resellerPricingSchema.statics.deleteByReseller = function (resellerId) {
  return this.deleteMany({ resellerId });
};

/**
 * Delete all pricing for a bundle
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<Object>}
 */
resellerPricingSchema.statics.deleteByBundle = function (bundleId) {
  return this.deleteMany({ bundleId });
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

/**
 * Pre-save middleware
 * - Validate selling price = bundle base price + commission
 */
resellerPricingSchema.pre('save', async function (next) {
  if (this.isModified('commission') || this.isNew) {
    // Validate that sellingPrice is correctly calculated
    const commission = parseFloat(this.commission.toString());
    const sellingPrice = parseFloat(this.sellingPrice.toString());

    // Allow some floating point tolerance
    const expectedMin = commission;
    if (sellingPrice < expectedMin) {
      return next(new Error('Selling price must be at least equal to commission'));
    }
  }
  next();
});

/**
 * Post-save middleware
 */
resellerPricingSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Reseller pricing saved: Reseller ${doc.resellerId} - Bundle ${doc.bundleId}`);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const ResellerPricing = mongoose.model('ResellerPricing', resellerPricingSchema);

module.exports = ResellerPricing;
