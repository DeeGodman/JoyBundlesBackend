// HELPER UTILITIES
// Common helper functions for data formatting and calculations

/**
 * Calculate profit from cost and selling price
 * @param {number} costPrice - Cost price
 * @param {number} sellingPrice - Selling price
 * @returns {number} Profit amount
 */
const calculateProfit = (costPrice, sellingPrice) => {
  return Number(sellingPrice) - Number(costPrice);
};

/**
 * Calculate commission for reseller
 * @param {number} basePrice - Base price (what reseller pays)
 * @param {number} sellingPrice - Selling price (what customer pays)
 * @returns {number} Commission amount
 */
const calculateCommission = (basePrice, sellingPrice) => {
  return Number(sellingPrice) - Number(basePrice);
};

/**
 * Generate unique order number
 * Format: ORD-XXX (e.g., ORD-001, ORD-002)
 * @returns {string} Order number
 */
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}${random}`;
};

/**
 * Generate unique reseller ID
 * Format: RES-XXX (e.g., RES-001)
 * @param {number} count - Current reseller count
 * @returns {string} Reseller ID
 */
const generateResellerId = (count) => {
  const id = (count + 1).toString().padStart(3, "0");
  return `RES-${id}`;
};

/**
 * Generate unique referral code
 * Format: Alphanumeric 8 characters (e.g., ABC12345)
 * @returns {string} Referral code
 */
const generateReferralCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Generate unique ticket number
 * Format: TKT-XXXXX (e.g., TKT-12345)
 * @returns {string} Ticket number
 */
const generateTicketNumber = () => {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `TKT-${random}`;
};

/**
 * Format phone number to standard format
 * Converts various formats to: 0XXXXXXXXX
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle +233 format
  if (cleaned.startsWith("233")) {
    cleaned = "0" + cleaned.slice(3);
  }

  // Ensure it starts with 0
  if (!cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }

  return cleaned;
};

/**
 * Calculate selling price from base price and commission
 * @param {number} basePrice - Base price
 * @param {number} commission - Commission amount
 * @returns {number} Selling price
 */
const calculateSellingPrice = (basePrice, commission) => {
  return Number(basePrice) + Number(commission);
};

/**
 * Sanitize user data for response (remove sensitive fields)
 * @param {Object} user - User object
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user) => {
  const { password, ...sanitized } = user;
  return sanitized;
};

/**
 * Convert Prisma Decimal to number
 * @param {Decimal} decimal - Prisma Decimal value
 * @returns {number} Number value
 */
const decimalToNumber = (decimal) => {
  return decimal ? Number(decimal) : 0;
};

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
const calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return ((part / total) * 100).toFixed(2);
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

/**
 * Get time ago string (e.g., "2 mins ago", "1 hour ago")
 * @param {Date|string} date - Date to compare
 * @returns {string} Time ago string
 */
const getTimeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

/**
 * Validate Ghana phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
const isValidGhanaPhone = (phone) => {
  const regex = /^(?:\+233|0)[2-5]\d{8}$/;
  return regex.test(phone.replace(/\s/g, ""));
};

/**
 * Paginate array
 * @param {Array} items - Items to paginate
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Paginated result
 */
const paginate = (items, page = 1, limit = 20) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedItems = items.slice(startIndex, endIndex);
  const total = items.length;
  const totalPages = Math.ceil(total / limit);

  return {
    items: paginatedItems,
    pagination: {
      currentPage: page,
      totalPages,
      limit,
      total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && Object.keys(value).length === 0) return true;
  return false;
};

/**
 * Round number to 2 decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
const roundToTwo = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

module.exports = {
  calculateProfit,
  calculateCommission,
  generateOrderNumber,
  generateResellerId,
  generateReferralCode,
  generateTicketNumber,
  formatPhoneNumber,
  calculateSellingPrice,
  sanitizeUser,
  decimalToNumber,
  calculatePercentage,
  formatDate,
  getTimeAgo,
  isValidGhanaPhone,
  paginate,
  sleep,
  isEmpty,
  roundToTwo,
};
