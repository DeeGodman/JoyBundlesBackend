const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Order } = require("./src/models");

dotenv.config();

const verifyLastOrder = async () => {
  await mongoose.connect(process.env.DATABASE_URL);

  // Get the most recent order
  const order = await Order.findOne().sort({ createdAt: -1 });

  if (!order) {
    console.log("❌ No orders found!");
    process.exit(0);
  }

  console.log("\n🔍 Verifying Order:", order.orderNumber);
  console.log("-----------------------------------");
  console.log(`Base Price (Should be 12.00): ${order.basePrice}`);
  console.log(`Commission (Should be 5.00):  ${order.commission}`);
  console.log(`Selling Price (Should be 17.00): ${order.sellingPrice}`);
  console.log("-----------------------------------");

  if (parseFloat(order.sellingPrice) === 17.0) {
    console.log("✅ LOGIC TEST PASSED: Financial snapshot is correct.");
  } else {
    console.log("❌ LOGIC TEST FAILED: Calculations do not match.");
  }

  process.exit(0);
};

verifyLastOrder();
