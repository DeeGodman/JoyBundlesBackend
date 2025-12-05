// src/controllers/order.controller.js
const orderService = require("../services/order.service");
const paymentService = require("../services/payment.service");
const { successResponse } = require("../utils/response.util");

const createOrder = async (req, res, next) => {
  try {
    // Extract Referral Code from URL Query (e.g. ?ref=RES-001)
    const referralCode = req.query.ref;

    if (!referralCode) {
      const error = new Error("Referral code is required");
      error.statusCode = 400;
      throw error;
    }

    // 1. Initiate Order
    const { order, email } = await orderService.initiateOrder({
      bundleId: req.body.bundleId,
      // quantity: req.body.quantity, // Customer enters "6"
      customerPhone: req.body.customerPhone,
      customerEmail: req.body.email, // Pass email from body or user
      referralCode: referralCode,
    });

    // 2. Generate Payment Link
    const paymentUrl = await paymentService.initializePayment(order, email);

    // 3. Return Link to Frontend
    return successResponse(
      res,
      {
        orderNumber: order.orderNumber,
        paymentUrl,
      },
      "Order created, redirecting to payment...",
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder };
