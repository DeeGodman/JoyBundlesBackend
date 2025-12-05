const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
// Note: This route is public because customers buy without logging in
router.post("/create", orderController.createOrder);
module.exports = router;
