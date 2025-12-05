// ===================================
// TYPE VALIDATION HELPERS
// ===================================
// Runtime validation for MongoDB string fields that represent enums
// Ensures type safety since MongoDB doesn't have native enum support

const {
  UserRole,
  UserStatus,
  OrderStatus,
  PaymentStatus,
  Network,
  PricingMode,
  TicketStatus,
  TransactionType,
  TransactionStatus
} = require('../constants');

/**
 * Validate if value is a valid enum value
 * @param {*} value - Value to validate
 * @param {Object} enumObject - Enum object from constants
 * @returns {boolean}
 */
const isValidEnum = (value, enumObject) => {
  return Object.values(enumObject).includes(value);
};

/**
 * Get all valid values for an enum
 * @param {Object} enumObject - Enum object from constants
 * @returns {string[]}
 */
const getEnumValues = (enumObject) => {
  return Object.values(enumObject);
};

/**
 * Validate UserRole
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
const isValidUserRole = (role) => {
  return isValidEnum(role, UserRole);
};

/**
 * Validate UserStatus
 * @param {string} status - Status to validate
 * @returns {boolean}
 */
const isValidUserStatus = (status) => {
  return isValidEnum(status, UserStatus);
};

/**
 * Validate OrderStatus
 * @param {string} status - Status to validate
 * @returns {boolean}
 */
const isValidOrderStatus = (status) => {
  return isValidEnum(status, OrderStatus);
};

/**
 * Validate PaymentStatus
 * @param {string} status - Status to validate
 * @returns {boolean}
 */
const isValidPaymentStatus = (status) => {
  return isValidEnum(status, PaymentStatus);
};

/**
 * Validate Network
 * @param {string} network - Network to validate
 * @returns {boolean}
 */
const isValidNetwork = (network) => {
  return isValidEnum(network, Network);
};

/**
 * Validate PricingMode
 * @param {string} mode - Mode to validate
 * @returns {boolean}
 */
const isValidPricingMode = (mode) => {
  return isValidEnum(mode, PricingMode);
};

/**
 * Validate TicketStatus
 * @param {string} status - Status to validate
 * @returns {boolean}
 */
const isValidTicketStatus = (status) => {
  return isValidEnum(status, TicketStatus);
};

/**
 * Validate TransactionType
 * @param {string} type - Type to validate
 * @returns {boolean}
 */
const isValidTransactionType = (type) => {
  return isValidEnum(type, TransactionType);
};

/**
 * Validate TransactionStatus
 * @param {string} status - Status to validate
 * @returns {boolean}
 */
const isValidTransactionStatus = (status) => {
  return isValidEnum(status, TransactionStatus);
};

/**
 * Validate and normalize enum value
 * Converts to uppercase and validates
 * @param {string} value - Value to validate
 * @param {Object} enumObject - Enum object from constants
 * @param {string} fieldName - Field name for error message
 * @returns {string} - Validated uppercase value
 * @throws {Error} - If value is invalid
 */
const validateAndNormalizeEnum = (value, enumObject, fieldName) => {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }

  const normalized = value.toUpperCase();

  if (!isValidEnum(normalized, enumObject)) {
    const validValues = getEnumValues(enumObject).join(', ');
    throw new Error(
      `Invalid ${fieldName}: "${value}". Must be one of: ${validValues}`
    );
  }

  return normalized;
};

/**
 * Assert valid enum value (throws error if invalid)
 * @param {string} value - Value to validate
 * @param {Object} enumObject - Enum object from constants
 * @param {string} fieldName - Field name for error message
 * @throws {Error} - If value is invalid
 */
const assertValidEnum = (value, enumObject, fieldName) => {
  if (!isValidEnum(value, enumObject)) {
    const validValues = getEnumValues(enumObject).join(', ');
    throw new Error(
      `Invalid ${fieldName}: "${value}". Must be one of: ${validValues}`
    );
  }
};

/**
 * Validate ObjectId format
 * MongoDB ObjectId is a 24-character hexadecimal string
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Assert valid ObjectId (throws error if invalid)
 * @param {string} id - ID to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Error} - If ID is invalid
 */
const assertValidObjectId = (id, fieldName = 'ID') => {
  if (!isValidObjectId(id)) {
    throw new Error(
      `Invalid ${fieldName}: "${id}". Must be a valid MongoDB ObjectId (24 hex characters)`
    );
  }
};

/**
 * Validate Decimal value
 * Ensures value is a positive number
 * @param {number|string} value - Value to validate
 * @param {number} min - Minimum value (default: 0)
 * @returns {boolean}
 */
const isValidDecimal = (value, min = 0) => {
  const num = Number(value);
  return !isNaN(num) && num >= min;
};

/**
 * Assert valid Decimal (throws error if invalid)
 * @param {number|string} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} min - Minimum value (default: 0)
 * @throws {Error} - If value is invalid
 */
const assertValidDecimal = (value, fieldName, min = 0) => {
  if (!isValidDecimal(value, min)) {
    throw new Error(
      `Invalid ${fieldName}: "${value}". Must be a number >= ${min}`
    );
  }
};

/**
 * Validate phone number format (Ghana)
 * Format: 0XXXXXXXXX (10 digits starting with 0)
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Ghana phone: 10 digits starting with 0, second digit is 2-5
  return /^0[2-5]\d{8}$/.test(phone);
};

/**
 * Assert valid phone number (throws error if invalid)
 * @param {string} phone - Phone number to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Error} - If phone is invalid
 */
const assertValidPhone = (phone, fieldName = 'Phone number') => {
  if (!isValidPhone(phone)) {
    throw new Error(
      `Invalid ${fieldName}: "${phone}". Must be Ghana phone format: 0XXXXXXXXX`
    );
  }
};

/**
 * Type guards for MongoDB data
 */
const TypeGuards = {
  isUser: (obj) => obj && obj.id && obj.email && obj.role,
  isReseller: (obj) => obj && obj.id && obj.userId && obj.resellerId,
  isBundle: (obj) => obj && obj.id && obj.name && obj.network,
  isOrder: (obj) => obj && obj.id && obj.orderNumber && obj.bundleId,
  isTransaction: (obj) => obj && obj.id && obj.transactionNumber && obj.type,
};

module.exports = {
  // Enum validation
  isValidEnum,
  getEnumValues,
  isValidUserRole,
  isValidUserStatus,
  isValidOrderStatus,
  isValidPaymentStatus,
  isValidNetwork,
  isValidPricingMode,
  isValidTicketStatus,
  isValidTransactionType,
  isValidTransactionStatus,
  validateAndNormalizeEnum,
  assertValidEnum,

  // ObjectId validation
  isValidObjectId,
  assertValidObjectId,

  // Decimal validation
  isValidDecimal,
  assertValidDecimal,

  // Phone validation
  isValidPhone,
  assertValidPhone,

  // Type guards
  TypeGuards,
};
