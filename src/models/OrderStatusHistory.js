// ===================================
// ORDER STATUS HISTORY MODEL
// ===================================
// Mongoose model for OrderStatusHistory collection

const mongoose = require('mongoose');
const { OrderStatus } = require('../constants');

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(OrderStatus),
        message: 'Invalid order status',
      },
      required: [true, 'Status is required'],
    },

    notes: {
      type: String,
      default: null,
      maxlength: [500, 'Notes must not exceed 500 characters'],
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// ===================================
// INDEXES
// ===================================

orderStatusHistorySchema.index({ orderId: 1, createdAt: -1 });

// ===================================
// VIRTUALS
// ===================================

orderStatusHistorySchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

// ===================================
// STATIC METHODS
// ===================================

orderStatusHistorySchema.statics.findByOrder = function (orderId) {
  return this.find({ orderId }).sort({ createdAt: -1 });
};

orderStatusHistorySchema.statics.getLatestByOrder = function (orderId) {
  return this.findOne({ orderId }).sort({ createdAt: -1 });
};

// ===================================
// MODEL EXPORT
// ===================================

const OrderStatusHistory = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);

module.exports = OrderStatusHistory;
