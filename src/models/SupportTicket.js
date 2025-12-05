// ===================================
// SUPPORT TICKET MODEL
// ===================================
// Mongoose model for SupportTicket collection

const mongoose = require('mongoose');
const { TicketStatus } = require('../constants');

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: [true, 'Ticket number is required'],
      unique: true,
      index: true,
      match: [/^TKT-\d{5}$/, 'Ticket number must be in format TKT-XXXXX'],
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      index: true,
    },

    customerPhone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      match: [/^0[2-5]\d{8}$/, 'Invalid Ghana phone number format'],
    },

    message: {
      type: String,
      required: [true, 'Message is required'],
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [1000, 'Message must not exceed 1000 characters'],
    },

    status: {
      type: String,
      enum: {
        values: Object.values(TicketStatus),
        message: 'Invalid ticket status',
      },
      default: TicketStatus.OPEN,
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
      lowercase: true,
      index: true,
    },

    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
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

supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ orderId: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ assignedToId: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1 });

// ===================================
// VIRTUALS
// ===================================

supportTicketSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

supportTicketSchema.virtual('messages', {
  ref: 'SupportMessage',
  localField: '_id',
  foreignField: 'ticketId',
});

// ===================================
// INSTANCE METHODS
// ===================================

supportTicketSchema.methods.isOpen = function () {
  return this.status === TicketStatus.OPEN;
};

supportTicketSchema.methods.isInProgress = function () {
  return this.status === TicketStatus.IN_PROGRESS;
};

supportTicketSchema.methods.isResolved = function () {
  return this.status === TicketStatus.RESOLVED;
};

supportTicketSchema.methods.isClosed = function () {
  return this.status === TicketStatus.CLOSED;
};

supportTicketSchema.methods.assign = async function (adminId) {
  this.assignedToId = adminId;
  this.status = TicketStatus.IN_PROGRESS;
  return await this.save();
};

supportTicketSchema.methods.resolve = async function () {
  this.status = TicketStatus.RESOLVED;
  this.resolvedAt = new Date();
  return await this.save();
};

supportTicketSchema.methods.close = async function () {
  this.status = TicketStatus.CLOSED;
  if (!this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  return await this.save();
};

// ===================================
// STATIC METHODS
// ===================================

supportTicketSchema.statics.findByTicketNumber = function (ticketNumber) {
  return this.findOne({ ticketNumber })
    .populate('order')
    .populate('messages');
};

supportTicketSchema.statics.findByOrder = function (orderId) {
  return this.find({ orderId }).sort({ createdAt: -1 });
};

supportTicketSchema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

supportTicketSchema.statics.findOpen = function () {
  return this.find({ status: TicketStatus.OPEN }).sort({ createdAt: -1 });
};

supportTicketSchema.statics.findAssignedTo = function (adminId) {
  return this.find({ assignedToId: adminId }).sort({ createdAt: -1 });
};

supportTicketSchema.statics.getNextTicketNumber = async function () {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `TKT-${random}`;
};

// ===================================
// MIDDLEWARE (HOOKS)
// ===================================

supportTicketSchema.pre('save', function (next) {
  if (this.isModified('priority')) {
    this.priority = this.priority.toLowerCase();
  }
  next();
});

supportTicketSchema.post('save', function (doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Support ticket saved: ${doc.ticketNumber} (${doc.status})`);
  }
});

// ===================================
// MODEL EXPORT
// ===================================

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;
