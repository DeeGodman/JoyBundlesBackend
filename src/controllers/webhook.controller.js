// src/controllers/webhook.controller.js
const crypto = require("crypto");
const { config } = require("../config/env");
const { paymentQueue } = require("../services/queues/payment.queue"); // <--- Import Payment Queue

const handlePaystackWebhook = async (req, res) => {
  try {
    // 1. Validate Signature (Security FIRST)
    // We validate here so we don't fill Redis with fake requests
    const hash = crypto
      .createHmac("sha512", config.payment.secretKey)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).send("Invalid signature");
    }

    // 2. Push to Redis (Fire and Forget)
    // We add the entire body to the queue
    await paymentQueue.add(req.body, {
      attempts: 5, // Retry 5 times if DB is down
      backoff: 5000, // Wait 5s between retries
      removeOnComplete: true,
    });

    console.log(`📥 Webhook queued: ${req.body.data?.reference}`);

    // 3. Instant Response
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook Receiver Error:", error);
    res.sendStatus(500);
  }
};

module.exports = { handlePaystackWebhook };
