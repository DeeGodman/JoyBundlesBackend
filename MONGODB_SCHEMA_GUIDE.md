# MongoDB Schema Validation & Type Safety Guide

## Overview

This document explains how type safety and validation are enforced in the JoyBundles backend using MongoDB with Prisma.

**Important**: MongoDB doesn't support native enums or database-level constraints like PostgreSQL. All validation is enforced at the application level.

---

## Table of Contents

1. [Enum Validation](#enum-validation)
2. [Type Safety Strategy](#type-safety-strategy)
3. [Field Constraints](#field-constraints)
4. [Validation Layers](#validation-layers)
5. [Best Practices](#best-practices)
6. [Testing Validation](#testing-validation)

---

## Enum Validation

### Why String Fields?

MongoDB doesn't have native enum types. We use `String` fields with application-level validation.

### Enum Definitions

All enum values are defined in `src/constants/index.js`:

```javascript
const UserRole = {
  ADMIN: "ADMIN",
  RESELLER: "RESELLER"
};

const UserStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  REJECTED: "REJECTED"
};

const OrderStatus = {
  ACCEPTED: "ACCEPTED",
  PROCESSING: "PROCESSING",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED"
};

const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED"
};

const Network = {
  MTN: "MTN",
  TELECEL: "TELECEL",
  AT: "AT"
};

const PricingMode = {
  PRESET: "PRESET",
  CUSTOM: "CUSTOM"
};

const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED"
};

const TransactionType = {
  ORDER_PAYMENT: "ORDER_PAYMENT",
  COMMISSION_EARNING: "COMMISSION_EARNING",
  WITHDRAWAL: "WITHDRAWAL",
  REFUND: "REFUND"
};

const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
};
```

### Using Enums in Code

```javascript
// ✅ Correct
const user = {
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE
};

// ❌ Wrong (typo will cause issues)
const user = {
  role: "AMIN", // Typo!
  status: "ACTIV"
};
```

---

## Type Safety Strategy

### 3-Layer Validation Approach

```
┌─────────────────────────────────────────┐
│   Layer 1: Zod Schema Validation       │
│   (src/utils/validators.js)            │
│   - Validates request body format      │
│   - Checks required fields             │
│   - Validates data types               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Layer 2: Service Layer Validation    │
│   (src/services/*.js)                  │
│   - Business logic validation          │
│   - Cross-field validation             │
│   - Database constraint checks         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Layer 3: Runtime Type Guards          │
│   (src/types/validation.js)            │
│   - Enum value validation              │
│   - ObjectId format validation         │
│   - Type assertions                    │
└─────────────────────────────────────────┘
```

### Example: Complete Validation Flow

```javascript
// Layer 1: Zod Schema (validators.js)
const createOrderSchema = z.object({
  bundleId: z.string().uuid("Invalid bundle ID"),
  customerPhone: z.string().regex(/^0[2-5]\d{8}$/, "Invalid phone"),
  network: z.enum(["MTN", "TELECEL", "AT"])
});

// Layer 2: Service Layer (order.service.js)
const createOrder = async (data) => {
  // Validate enum
  assertValidEnum(data.network, Network, "network");
  
  // Validate ObjectId
  assertValidObjectId(data.bundleId, "bundleId");
  
  // Business logic validation
  const bundle = await prisma.bundle.findUnique({
    where: { id: data.bundleId }
  });
  
  if (!bundle.active) {
    throw new Error("Bundle is not active");
  }
  
  // Create order
  return await prisma.order.create({ data });
};

// Layer 3: Runtime Guards (validation.js)
const assertValidEnum = (value, enumObject, fieldName) => {
  if (!isValidEnum(value, enumObject)) {
    const validValues = getEnumValues(enumObject).join(', ');
    throw new Error(
      `Invalid ${fieldName}: "${value}". Must be one of: ${validValues}`
    );
  }
};
```

---

## Field Constraints

### String Fields with Enum Values

| Field | Model | Valid Values | Validated In |
|-------|-------|--------------|--------------|
| `role` | User | ADMIN, RESELLER | validators.js, constants |
| `status` | User | PENDING, ACTIVE, SUSPENDED, REJECTED | validators.js, constants |
| `status` | Order | ACCEPTED, PROCESSING, DELIVERED, FAILED, REFUNDED | validators.js, constants |
| `paymentStatus` | Order | PENDING, PAID, FAILED, REFUNDED | validators.js, constants |
| `network` | Bundle | MTN, TELECEL, AT | validators.js, constants |
| `pricingMode` | Reseller | PRESET, CUSTOM | validators.js, constants |
| `status` | SupportTicket | OPEN, IN_PROGRESS, RESOLVED, CLOSED | validators.js, constants |
| `type` | Transaction | ORDER_PAYMENT, COMMISSION_EARNING, WITHDRAWAL, REFUND | validators.js, constants |
| `status` | Transaction | PENDING, COMPLETED, FAILED | validators.js, constants |

### String Fields with Format Constraints

| Field | Format | Example | Validated By |
|-------|--------|---------|--------------|
| `email` | Email format | user@example.com | Zod regex |
| `phone` | Ghana phone: 0XXXXXXXXX | 0241234567 | Zod regex |
| `resellerId` | RES-XXX | RES-001 | Custom generator |
| `orderNumber` | ORD-XXXXXXXXX | ORD-123456789 | Custom generator |
| `ticketNumber` | TKT-XXXXX | TKT-12345 | Custom generator |
| `referralCode` | 8 alphanumeric | ABC12345 | Custom generator |

### Numeric Fields with Constraints

| Field | Model | Min Value | Max Value | Note |
|-------|-------|-----------|-----------|------|
| `costPrice` | Bundle | 0.01 | - | Must be positive |
| `basePrice` | Bundle | costPrice | - | Must be >= costPrice |
| `commission` | ResellerPricing | 0 | - | Non-negative |
| `amount` | Transaction | 0.01 | - | Must be positive |
| `deliveryAttempts` | Order | 0 | 3 | Max 3 attempts |
| `totalSales` | Reseller | 0 | - | Non-negative |
| `totalEarnings` | Reseller | 0 | - | Non-negative |

### ObjectId Fields

All foreign key references use `@db.ObjectId`:

```prisma
model Order {
  id         String  @id @default(auto()) @map("_id") @db.ObjectId
  bundleId   String  @db.ObjectId  // ← Foreign key
  resellerId String? @db.ObjectId  // ← Optional foreign key
  
  bundle     Bundle   @relation(fields: [bundleId], references: [id])
  reseller   Reseller? @relation(fields: [resellerId], references: [id])
}
```

**Validation**:
```javascript
const { isValidObjectId } = require('../types/validation');

if (!isValidObjectId(bundleId)) {
  throw new Error("Invalid bundle ID format");
}
```

---

## Validation Layers

### Layer 1: Zod Schema Validation

**Location**: `src/utils/validators.js`

**Purpose**: Validate incoming HTTP requests

**Example**:
```javascript
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^0[2-5]\d{8}$/),
  password: z.string().min(6)
});
```

**Applied In**: Middleware
```javascript
router.post('/register', validate(registerSchema), authController.register);
```

### Layer 2: Service Layer Validation

**Location**: `src/services/*.js`

**Purpose**: Business logic and database constraints

**Example**:
```javascript
const approveReseller = async (userId, requestingUser) => {
  // Check permissions
  if (requestingUser.role !== UserRole.ADMIN) {
    throw createError("Unauthorized", 403);
  }
  
  // Check current status
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (user.status === UserStatus.ACTIVE) {
    throw createError("Reseller already approved", 400);
  }
  
  // Update status
  return await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE }
  });
};
```

### Layer 3: Runtime Type Guards

**Location**: `src/types/validation.js`

**Purpose**: Runtime type checking and assertions

**Available Functions**:

```javascript
// Enum validation
isValidEnum(value, enumObject)
isValidUserRole(role)
isValidOrderStatus(status)
isValidNetwork(network)
assertValidEnum(value, enumObject, fieldName)

// ObjectId validation
isValidObjectId(id)
assertValidObjectId(id, fieldName)

// Decimal validation
isValidDecimal(value, min)
assertValidDecimal(value, fieldName, min)

// Phone validation
isValidPhone(phone)
assertValidPhone(phone, fieldName)

// Type guards
TypeGuards.isUser(obj)
TypeGuards.isOrder(obj)
TypeGuards.isBundle(obj)
```

**Usage Example**:
```javascript
const { assertValidEnum, assertValidObjectId } = require('../types/validation');
const { Network } = require('../constants');

// In service method
const createBundle = async (data) => {
  // Validate enum
  assertValidEnum(data.network, Network, "network");
  // Throws: "Invalid network: "mtn". Must be one of: MTN, TELECEL, AT"
  
  // Validate ObjectId
  assertValidObjectId(data.id, "bundle ID");
  // Throws: "Invalid bundle ID: "123". Must be a valid MongoDB ObjectId"
  
  // Continue with creation
  return await prisma.bundle.create({ data });
};
```

---

## Best Practices

### 1. Always Use Constants

```javascript
// ✅ Good
const user = {
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE
};

// ❌ Bad - Hardcoded strings
const user = {
  role: "ADMIN",
  status: "ACTIVE"
};
```

### 2. Validate Before Database Operations

```javascript
// ✅ Good
const updateStatus = async (orderId, newStatus) => {
  // Validate enum first
  assertValidEnum(newStatus, OrderStatus, "status");
  
  // Then update database
  return await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus }
  });
};

// ❌ Bad - No validation
const updateStatus = async (orderId, newStatus) => {
  return await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus } // Could be invalid!
  });
};
```

### 3. Use Type Guards for Complex Objects

```javascript
const { TypeGuards } = require('../types/validation');

// ✅ Good
const processOrder = (order) => {
  if (!TypeGuards.isOrder(order)) {
    throw new Error("Invalid order object");
  }
  
  // Safe to use order properties
  console.log(order.orderNumber);
};
```

### 4. Validate ObjectIds Before Queries

```javascript
// ✅ Good
const getUser = async (userId) => {
  assertValidObjectId(userId, "user ID");
  
  return await prisma.user.findUnique({
    where: { id: userId }
  });
};

// ❌ Bad - MongoDB will throw error for invalid ObjectId
const getUser = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId } // Crashes if invalid!
  });
};
```

### 5. Transform Frontend Data

```javascript
// Frontend might send lowercase
const createBundle = async (data) => {
  // Normalize to uppercase
  const network = data.network.toUpperCase();
  
  // Validate
  assertValidEnum(network, Network, "network");
  
  // Save to database
  return await prisma.bundle.create({
    data: { ...data, network }
  });
};
```

---

## Testing Validation

### Unit Tests for Enum Validation

```javascript
const { isValidEnum, getEnumValues } = require('../types/validation');
const { UserRole } = require('../constants');

describe('Enum Validation', () => {
  test('validates correct enum values', () => {
    expect(isValidEnum('ADMIN', UserRole)).toBe(true);
    expect(isValidEnum('RESELLER', UserRole)).toBe(true);
  });
  
  test('rejects invalid enum values', () => {
    expect(isValidEnum('MANAGER', UserRole)).toBe(false);
    expect(isValidEnum('admin', UserRole)).toBe(false); // Case sensitive
  });
  
  test('returns all enum values', () => {
    const values = getEnumValues(UserRole);
    expect(values).toEqual(['ADMIN', 'RESELLER']);
  });
});
```

### Integration Tests for Database Operations

```javascript
describe('User Creation', () => {
  test('creates user with valid role', async () => {
    const user = await prisma.user.create({
      data: {
        name: "Test User",
        email: "test@example.com",
        phone: "0241234567",
        password: "hashed",
        role: UserRole.RESELLER,
        status: UserStatus.PENDING
      }
    });
    
    expect(user.role).toBe('RESELLER');
    expect(user.status).toBe('PENDING');
  });
  
  test('validates role enum in service layer', async () => {
    await expect(
      userService.create({
        role: 'INVALID_ROLE' // Should be caught by validation
      })
    ).rejects.toThrow('Invalid role');
  });
});
```

---

## Common Validation Patterns

### Pattern 1: Validate and Normalize

```javascript
const normalizeAndValidate = (value, enumObject, fieldName) => {
  // Convert to uppercase
  const normalized = value.toUpperCase();
  
  // Validate
  assertValidEnum(normalized, enumObject, fieldName);
  
  return normalized;
};

// Usage
const network = normalizeAndValidate(req.body.network, Network, "network");
```

### Pattern 2: Batch Validation

```javascript
const validateOrderData = (data) => {
  const errors = [];
  
  // Validate multiple fields
  if (!isValidObjectId(data.bundleId)) {
    errors.push('Invalid bundle ID');
  }
  
  if (!isValidNetwork(data.network)) {
    errors.push('Invalid network');
  }
  
  if (!isValidPhone(data.customerPhone)) {
    errors.push('Invalid phone number');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};
```

### Pattern 3: Conditional Validation

```javascript
const validateUser = (user, isUpdate = false) => {
  // Always validate role
  assertValidEnum(user.role, UserRole, "role");
  
  // Only validate status if updating
  if (isUpdate && user.status) {
    assertValidEnum(user.status, UserStatus, "status");
  }
  
  // Only validate password on creation
  if (!isUpdate && !user.password) {
    throw new Error("Password is required");
  }
};
```

---

## Troubleshooting

### Issue 1: "Invalid enum value" errors

**Problem**: Database contains lowercase values, but constants use uppercase.

**Solution**: Add data migration script or transform data on read:

```javascript
const getUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  // Transform to uppercase
  if (user) {
    user.role = user.role.toUpperCase();
    user.status = user.status.toUpperCase();
  }
  
  return user;
};
```

### Issue 2: ObjectId validation failing

**Problem**: Passing non-ObjectId strings (like "123" or "test-id").

**Solution**: Always validate ObjectId format before database operations:

```javascript
if (!isValidObjectId(userId)) {
  throw new Error("Invalid user ID format");
}
```

### Issue 3: Frontend sends lowercase enum values

**Problem**: Frontend sends "mtn" but database expects "MTN".

**Solution**: Normalize in validator:

```javascript
network: z.string()
  .transform(val => val.toUpperCase())
  .refine(val => ["MTN", "TELECEL", "AT"].includes(val))
```

---

## Summary

✅ **Type Safety Checklist**:

- [ ] All enum values defined in `src/constants/index.js`
- [ ] Validation helpers in `src/types/validation.js`
- [ ] Zod schemas validate request data
- [ ] Service layer validates business logic
- [ ] Runtime guards check enum values
- [ ] ObjectIds validated before queries
- [ ] Phone numbers match Ghana format
- [ ] Decimal values are positive where required
- [ ] Foreign keys use `@db.ObjectId`
- [ ] Comments in schema explain constraints

**Remember**: MongoDB doesn't enforce constraints at the database level. Your application code is the source of truth for data integrity!

---

## Resources

- **Prisma MongoDB Docs**: https://www.prisma.io/docs/concepts/database-connectors/mongodb
- **Zod Documentation**: https://zod.dev/
- **MongoDB ObjectId**: https://www.mongodb.com/docs/manual/reference/method/ObjectId/

---

Generated: 2024
Project: JoyBundles Backend
MongoDB Version: 6.0+
Prisma Version: 6.0+