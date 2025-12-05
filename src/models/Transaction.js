// ===================================
// TRANSACTION MODEL
// ===================================
// Mongoose model for Transaction collection

const mongoose = require('mongoose');
const { TransactionType, TransactionStatus } = require('../constants');

const transactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: [true, 'Transaction number is required'],
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: {
        values: Object.values(TransactionType),
        message: 'Invalid transaction type',
      },
      required: [true, 'Transaction type is required'],
      index: true,
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be at least 0.01'],
      get: (value) => (value ? parseFloat(value.toString()) : 0),
    },

    currency: {
      type: String,
      default: 'GHS',
      uppercase: true,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(TransactionStatus),
        message: 'Invalid transaction status',
      },
      default: TransactionStatus.PENDING,
      required: true,
      index: true,
    },

    paymentProvider: {
      type: String,
      default: null,
    },

    providerReference: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
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

transactionSchema.index({ transactionNumber: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });

// ===================================
// VIRTUALS
// ===================================

transactionSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

// ===================================
// INSTANCE METHODS
// ===================================

transactionSchema.methods.isPending = function () {
  return this.status === TransactionStatus.PENDING;
};

transactionSchema.methods.isCompleted = function () {
  return this.status === TransactionStatus.COMPLETED;
};

transactionSchema.methods.isFailed = function () {
  return this.status === TransactionStatus.FAILED;
};

transactionSchema.methods.markAsCompleted = async function () {
  this.status = TransactionStatus.COMPLETED;
  return await this.save();
};

transactionSchema.methods.markAsFailed = async function () {
  this.status = TransactionStatus.FAILED;
  return await this.save();
};

// ===================================
// STATIC METHODS
// ===================================

transactionSchema.statics.findByTransactionNumber = function (transactionNumber) {
  return this.findOne({ transactionNumber });
};

transactionSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByOrder = function (orderId) {
  return this.find({ orderId }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByType = function (type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

transactionSchema.statics.getNextTransactionNumber = async function () {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TXN-${timestamp}${random}`;
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

transactionSchema.pre('save', function (next) {
  if (this.isModified('currency')) {
    this.currency = this.currency.toUpperCase();
  }
  next();
});

transactionSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Transaction saved: ${doc.transactionNumber} (${doc.status})`);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
