const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhook.controller");
// Public route, no auth middleware (Paystack calls this)
router.post("/paystack", webhookController.handlePaystackWebhook);
module.exports = router;
