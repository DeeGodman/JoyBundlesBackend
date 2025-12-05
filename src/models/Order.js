// ===================================
// ORDER MODEL
// ===================================
// Mongoose model for Order collection

const mongoose = require('mongoose');
const { Network, OrderStatus, PaymentStatus } = require('../constants');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      index: true,
      match: [/^ORD-\d+$/, 'Order number must be in format ORD-XXXXXXXXX'],
    },

    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      match: [/^0[2-5]\d{8}$/, 'Invalid Ghana phone number format'],
      index: true,
    },

    bundleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bundle',
      required: [true, 'Bundle ID is required'],
    },

    resellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reseller',
      default: null,
    },

    network: {
      type: String,
      required: [true, 'Network is required'],
      enum: {
        values: Object.values(Network),
        message: 'Network must be MTN, TELECEL, or AT',
      },
      uppercase: true,
      index: true,
    },

    bundleName: {
      type: String,
      required: [true, 'Bundle name is required'],
    },

    costPrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    basePrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    sellingPrice: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    commission: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
      min: [0, 'Commission cannot be negative'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    profit: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Profit is required'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    status: {
      type: String,
      enum: {
        values: Object.values(OrderStatus),
        message: 'Invalid order status',
      },
      default: OrderStatus.ACCEPTED,
      required: true,
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: {
        values: Object.values(PaymentStatus),
        message: 'Invalid payment status',
      },
      default: PaymentStatus.PENDING,
      required: true,
      index: true,
    },

    paymentReference: {
      type: String,
      default: null,
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
      maxlength: [500, 'Failure reason must not exceed 500 characters'],
    },

    deliveryAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Delivery attempts cannot be negative'],
      max: [3, 'Maximum delivery attempts is 3'],
    },

    deliveredAt: {
      type: Date,
      default: null,
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

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ resellerId: 1 });
orderSchema.index({ bundleId: 1 });
orderSchema.index({ network: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

// ===================================
// VIRTUALS
// ===================================

orderSchema.virtual('bundle', {
  ref: 'Bundle',
  localField: 'bundleId',
  foreignField: '_id',
  justOne: true,
});

orderSchema.virtual('reseller', {
  ref: 'Reseller',
  localField: 'resellerId',
  foreignField: '_id',
  justOne: true,
});

orderSchema.virtual('statusHistory', {
  ref: 'OrderStatusHistory',
  localField: '_id',
  foreignField: 'orderId',
});

orderSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'orderId',
});

orderSchema.virtual('supportTickets', {
  ref: 'SupportTicket',
  localField: '_id',
  foreignField: 'orderId',
});

// ===================================
// INSTANCE METHODS
// ===================================

orderSchema.methods.isAccepted = function () {
  return this.status === OrderStatus.ACCEPTED;
};

orderSchema.methods.isProcessing = function () {
  return this.status === OrderStatus.PROCESSING;
};

orderSchema.methods.isDelivered = function () {
  return this.status === OrderStatus.DELIVERED;
};

orderSchema.methods.isFailed = function () {
  return this.status === OrderStatus.FAILED;
};

orderSchema.methods.isRefunded = function () {
  return this.status === OrderStatus.REFUNDED;
};

orderSchema.methods.isPaid = function () {
  return this.paymentStatus === PaymentStatus.PAID;
};

orderSchema.methods.markAsProcessing = async function () {
  this.status = OrderStatus.PROCESSING;
  return await this.save();
};

orderSchema.methods.markAsDelivered = async function () {
  this.status = OrderStatus.DELIVERED;
  this.deliveredAt = new Date();
  return await this.save();
};

orderSchema.methods.markAsFailed = async function (reason) {
  this.status = OrderStatus.FAILED;
  this.failureReason = reason;
  this.deliveryAttempts += 1;
  return await this.save();
};

orderSchema.methods.markAsPaid = async function (reference) {
  this.paymentStatus = PaymentStatus.PAID;
  this.paymentReference = reference;
  return await this.save();
};

orderSchema.methods.canRetry = function () {
  return this.deliveryAttempts < 3;
};

// ===================================
// STATIC METHODS
// ===================================

orderSchema.statics.findByOrderNumber = function (orderNumber) {
  return this.findOne({ orderNumber });
};

orderSchema.statics.findByCustomerPhone = function (phone) {
  return this.find({ customerPhone: phone }).sort({ createdAt: -1 });
};

orderSchema.statics.findByReseller = function (resellerId) {
  return this.find({ resellerId }).sort({ createdAt: -1 });
};

orderSchema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

orderSchema.statics.findPending = function () {
  return this.find({
    status: { $in: [OrderStatus.ACCEPTED, OrderStatus.PROCESSING] },
  }).sort({ createdAt: -1 });
};

orderSchema.statics.getNextOrderNumber = async function () {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

orderSchema.pre('save', function (next) {
  if (this.isModified('network')) {
    this.network = this.network.toUpperCase();
  }
  next();
});

orderSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Order saved: ${doc.orderNumber} (${doc.status})`);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
