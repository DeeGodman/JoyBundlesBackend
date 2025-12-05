// seed-bundle.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Bundle } = require("./src/models");

dotenv.config();

const createBundle = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("🔌 Connected to DB");

    const bundle = await Bundle.create({
      name: "5GB Data Package",
      network: "MTN",
      volume: "5GB",
      costPrice: 10.0, // MNO Cost
      basePrice: 12.0, // Selling Price (before commission)
      active: true,
    });

    console.log("\n✅ Bundle Created Successfully!");
    console.log("=================================");
    console.log(`🆔 Bundle ID: ${bundle._id}`);
    console.log("=================================\n");
    console.log("Copy this ID for the next step!");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

createBundle();
