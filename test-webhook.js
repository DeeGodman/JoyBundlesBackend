const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const SECRET_KEY = process.env.PAYMENT_SECRET_KEY;
const BACKEND_URL = "http://localhost:5000/api/v1/webhooks/paystack";
const ORDER_NUMBER = "ORD-981152373"; // <--- UPDATE THIS

const payload = {
  event: "charge.success",
  data: {
    reference: ORDER_NUMBER,
    status: "success",
    amount: 1700, // Matches your 17.00 GHS price
    channel: "mobile_money",
    id: Math.floor(Math.random() * 1000000),
  },
};

const signature = crypto
  .createHmac("sha512", SECRET_KEY)
  .update(JSON.stringify(payload))
  .digest("hex");

const sendWebhook = async () => {
  try {
    console.log(`🚀 Sending Webhook for ${ORDER_NUMBER}...`);
    const response = await axios.post(BACKEND_URL, payload, {
      headers: {
        "x-paystack-signature": signature,
        "Content-Type": "application/json",
      },
    });
    console.log(`✅ Success! Server responded with: ${response.status}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

sendWebhook();
