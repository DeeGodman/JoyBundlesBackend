// ===================================
// BUNDLE MODEL
// ===================================
// Mongoose model for Bundle collection

const mongoose = require('mongoose');
const { Network } = require('../constants');

const bundleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Bundle name is required'],
      trim: true,
      minlength: [1, 'Bundle name must be at least 1 character'],
      maxlength: [100, 'Bundle name must not exceed 100 characters'],
    },

    network: {
      type: String,
      required: [true, 'Network is required'],
      enum: {
        values: Object.values(Network),
        message: 'Network must be MTN, TELECEL, or AT',
      },
      uppercase: true,
    },

    volume: {
      type: String,
      required: [true, 'Volume is required'],
      trim: true,
      // e.g., "1GB", "5GB", "10GB"
    },

    costPrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Cost price is required'],
      min: [0.01, 'Cost price must be at least 0.01'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    basePrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Base price is required'],
      min: [0.01, 'Base price must be at least 0.01'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    active: {
      type: Boolean,
      default: true,
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

bundleSchema.index({ network: 1 });
bundleSchema.index({ active: 1 });
bundleSchema.index({ name: 1 });
bundleSchema.index({ network: 1, active: 1 });
bundleSchema.index({ createdAt: -1 });

// ===================================
// VIRTUALS
// ===================================

// Virtual for orders
bundleSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'bundleId',
});

// Virtual for reseller pricing
bundleSchema.virtual('resellerPricing', {
  ref: 'ResellerPricing',
  localField: '_id',
  foreignField: 'bundleId',
});

// ===================================
// INSTANCE METHODS
// ===================================

/**
 * Check if bundle is active
 * @returns {boolean}
 */
bundleSchema.methods.isActive = function () {
  return this.active === true;
};

/**
 * Calculate profit margin
 * @returns {number}
 */
bundleSchema.methods.getProfitMargin = function () {
  const cost = parseFloat(this.costPrice.toString());
  const base = parseFloat(this.basePrice.toString());
  return base - cost;
};

/**
 * Calculate profit percentage
 * @returns {number}
 */
bundleSchema.methods.getProfitPercentage = function () {
  const cost = parseFloat(this.costPrice.toString());
  const base = parseFloat(this.basePrice.toString());
  if (cost === 0) return 0;
  return ((base - cost) / cost) * 100;
};

/**
 * Activate bundle
 * @returns {Promise<Bundle>}
 */
bundleSchema.methods.activate = async function () {
  this.active = true;
  return await this.save();
};

/**
 * Deactivate bundle
 * @returns {Promise<Bundle>}
 */
bundleSchema.methods.deactivate = async function () {
  this.active = false;
  return await this.save();
};

/**
 * Get selling price for preset commission
 * @param {number} commission - Commission percentage
 * @returns {number}
 */
bundleSchema.methods.getSellingPrice = function (commission) {
  const base = parseFloat(this.basePrice.toString());
  return base + commission;
};

// ===================================
// STATIC METHODS
// ===================================

/**
 * Find active bundles
 * @returns {Promise<Bundle[]>}
 */
bundleSchema.statics.findActive = function () {
  return this.find({ active: true });
};

/**
 * Find bundles by network
 * @param {string} network - Network (MTN, TELECEL, AT)
 * @returns {Promise<Bundle[]>}
 */
bundleSchema.statics.findByNetwork = function (network) {
  return this.find({ network: network.toUpperCase(), active: true });
};

/**
 * Find bundle by name and network
 * @param {string} name - Bundle name
 * @param {string} network - Network
 * @returns {Promise<Bundle|null>}
 */
bundleSchema.statics.findByNameAndNetwork = function (name, network) {
  return this.findOne({ name, network: network.toUpperCase() });
};

/**
 * Check if bundle exists
 * @param {string} name - Bundle name
 * @param {string} network - Network
 * @returns {Promise<boolean>}
 */
bundleSchema.statics.bundleExists = async function (name, network) {
  const count = await this.countDocuments({ name, network: network.toUpperCase() });
  return count > 0;
};

/**
 * Get all networks with bundles
 * @returns {Promise<string[]>}
 */
bundleSchema.statics.getAvailableNetworks = async function () {
  const networks = await this.distinct('network', { active: true });
  return networks;
};

/**
 * Get bundles count by network
 * @returns {Promise<Object>}
 */
bundleSchema.statics.getCountByNetwork = async function () {
  const result = await this.aggregate([
    { $match: { active: true } },
    { $group: { _id: '$network', count: { $sum: 1 } } },
  ]);

  return result.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

/**
 * Pre-save middleware
 * - Normalize network to uppercase
 * - Validate basePrice >= costPrice
 */
bundleSchema.pre('save', function (next) {
  // Normalize network
  if (this.isModified('network')) {
    this.network = this.network.toUpperCase();
  }

  // Validate basePrice >= costPrice
  if (this.isModified('costPrice') || this.isModified('basePrice')) {
    const cost = parseFloat(this.costPrice.toString());
    const base = parseFloat(this.basePrice.toString());

    if (base < cost) {
      return next(new Error('Base price must be greater than or equal to cost price'));
    }
  }

  next();
});

/**
 * Pre-findOneAndUpdate middleware
 */
bundleSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();

  if (update.network) {
    update.network = update.network.toUpperCase();
  }

  next();
});

/**
 * Post-save middleware
 * - Log bundle creation in development
 */
bundleSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Bundle saved: ${doc.name} (${doc.network})`);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const Bundle = mongoose.model('Bundle', bundleSchema);

module.exports = Bundle;
