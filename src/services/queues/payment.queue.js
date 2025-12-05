// src/queues/payment.queue.js
const Queue = require("bull");
const { Order, Reseller, Transaction } = require("../../models");
const {
  OrderStatus,
  PaymentStatus,
  TransactionType,
  TransactionStatus,
} = require("../../constants");
//const { notificationQueue } = require("./notification.queue"); // Import notification queue

// 1. Initialize Queue
const paymentQueue = new Queue(
  "payment-processing",
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
);

// 2. Define the Accounting Process
paymentQueue.process(async (job) => {
  const event = job.data; // This is the Paystack Event Body

  console.log(`💸 [Queue] Processing Payment: ${event.data.reference}`);

  try {
    if (event.event === "charge.success") {
      const orderNumber = event.data.reference;
      const order = await Order.findOne({ orderNumber });

      // A. Idempotency Check (Critical for Queues)
      if (!order) {
        console.error(`❌ Order ${orderNumber} not found!`);
        return;
      }
      if (order.paymentStatus === PaymentStatus.PAID) {
        console.log(`⚠️ Order ${orderNumber} already processed. Skipping.`);
        return;
      }

      // B. Update Order
      order.paymentStatus = PaymentStatus.PAID;
      order.status = OrderStatus.PROCESSING; // Ready for Admin
      order.paymentReference = event.data.id.toString();
      order.paymentMethod = event.data.channel;
      await order.save();

      // C. Credit Reseller (Atomic)
      if (order.resellerId) {
        await Reseller.findByIdAndUpdate(order.resellerId, {
          $inc: {
            totalEarnings: parseFloat(order.commission.toString()),
            totalSales: parseFloat(order.sellingPrice.toString()),
            totalOrders: 1,
          },
        });
      }

      // D. Log Transaction Ledger
      await Transaction.create({
        transactionNumber: `TXN-${Date.now()}`,
        orderId: order._id,
        userId: order.resellerId,
        type: TransactionType.ORDER_PAYMENT,
        amount: order.sellingPrice,
        status: TransactionStatus.COMPLETED,
        paymentProvider: "Paystack",
        providerReference: event.data.reference,
      });

      // E. Trigger Notification (Chaining Queues)
      // Tell Admin to fulfill manually
      await notificationQueue.add({
        type: "ADMIN_ALERT",
        recipient: "admin@joybundles.com",
        data: {
          orderNumber: order.orderNumber,
          amount: order.sellingPrice,
          bundle: order.bundleName,
        },
      });

      console.log(`✅ [Queue] Payment Processed: ${orderNumber}`);
    }
  } catch (error) {
    console.error(`❌ [Queue] Accounting Failed: ${error.message}`);
    throw error; // Triggers automatic retry
  }
});

module.exports = { paymentQueue };
