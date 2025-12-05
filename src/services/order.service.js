// src/services/order.service.js
const { Order, Reseller, Bundle, ResellerPricing } = require("../models");
const { generateOrderNumber } = require("../utils/helpers");
const { OrderStatus, PaymentStatus, PricingMode } = require("../constants");
const { createError } = require("../middleware/error.middleware");
const { HttpStatus } = require("../constants");

/**
 * Initiate Order (Fixed Bundle Selection)
 * Logic: Selling Price = Bundle Base Price + Reseller Commission
 */
const initiateOrder = async ({
  bundleId,
  referralCode,
  customerPhone,
  customerEmail,
}) => {
  // 1. Find Reseller
  const reseller = await Reseller.findOne({ referralCode });
  if (!reseller)
    throw createError("Invalid referral code", HttpStatus.NOT_FOUND);

  // 2. Find Bundle (Source of Base Price)
  const bundle = await Bundle.findById(bundleId);
  if (!bundle) throw createError("Bundle not found", HttpStatus.NOT_FOUND);

  if (!bundle.active)
    throw createError(
      "This bundle is currently unavailable",
      HttpStatus.BAD_REQUEST,
    );

  // 3. Determine Commission Value (Flat amount)
  // Default to the reseller's global preset (e.g., GHS 5.00)
  let commissionAmount = parseFloat(reseller.presetCommission.toString());

  // Check if they have a specific custom price for THIS bundle
  if (reseller.pricingMode === PricingMode.CUSTOM) {
    const customPricing = await ResellerPricing.findOne({
      resellerId: reseller._id,
      bundleId: bundle._id,
    });
    if (customPricing) {
      commissionAmount = parseFloat(customPricing.commission.toString());
    }
  }

  // 4. Financial Calculations (No Multiplier)
  // The Bundle document holds the price for exactly one of these items
  const costPrice = parseFloat(bundle.costPrice.toString()); // MNO Cost
  const basePrice = parseFloat(bundle.basePrice.toString()); // JoyBundle Base Price

  // Final Price the customer pays
  const finalSellingPrice = basePrice + commissionAmount;

  // Platform Profit
  const estimatedProfit = basePrice - costPrice;

  // 5. Create Order Snapshot
  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    customerPhone,
    bundleId: bundle._id,
    resellerId: reseller._id,
    network: bundle.network,
    bundleName: bundle.name, // e.g. "5GB Data Bundle"

    // Financial Snapshots (Saved as Decimal128 automatically)
    costPrice: costPrice,
    basePrice: basePrice,
    sellingPrice: finalSellingPrice,
    commission: commissionAmount,
    profit: estimatedProfit,

    status: OrderStatus.ACCEPTED,
    paymentStatus: PaymentStatus.PENDING,
  });

  return { order, email: customerEmail };
};

module.exports = { initiateOrder };
