// src/services/payment.service.js
const axios = require("axios");
const { config } = require("../config/env");
const { createError } = require("../middleware/error.middleware");

/**
 * Initialize Paystack Transaction
 * @param {Object} order - The order document
 * @param {string} email - Customer email
 */
const initializePayment = async (order, email) => {
  try {
    // Paystack expects amount in kobo/pesewas (multiply by 100)
    const amountInPesewas = Math.round(
      parseFloat(order.sellingPrice.toString()) * 100,
    );

    const params = {
      email: email,
      amount: amountInPesewas,
      reference: order.orderNumber, // Unique Order Ref matches our DB
      callback_url: `${config.frontend.url}/payment/callback`, // Where user goes after payment
      metadata: {
        orderId: order._id.toString(),
        resellerId: order.resellerId ? order.resellerId.toString() : null,
        custom_fields: [
          {
            display_name: "Bundle",
            variable_name: "bundle_name",
            value: order.bundleName,
          },
        ],
      },
    };

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      params,
      {
        headers: {
          Authorization: `Bearer ${config.payment.secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.data.authorization_url;
  } catch (error) {
    console.error(
      "Paystack Init Error:",
      error.response?.data || error.message,
    );
    throw createError("Payment initialization failed", 502);
  }
};

module.exports = { initializePayment };
