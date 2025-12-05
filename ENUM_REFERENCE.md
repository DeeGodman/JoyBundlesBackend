# MongoDB Enum Values - Quick Reference Card

## 🎯 Quick Lookup Table

| Field Name | Model(s) | Valid Values | Default |
|------------|----------|--------------|---------|
| **role** | User | `ADMIN`, `RESELLER` | `RESELLER` |
| **status** | User | `PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED` | `PENDING` |
| **pricingMode** | Reseller | `PRESET`, `CUSTOM` | `PRESET` |
| **network** | Bundle, Order | `MTN`, `TELECEL`, `AT` | - |
| **status** | Order | `ACCEPTED`, `PROCESSING`, `DELIVERED`, `FAILED`, `REFUNDED` | `ACCEPTED` |
| **paymentStatus** | Order | `PENDING`, `PAID`, `FAILED`, `REFUNDED` | `PENDING` |
| **status** | SupportTicket | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` | `OPEN` |
| **priority** | SupportTicket | `low`, `medium`, `high` | `medium` |
| **senderType** | SupportMessage | `customer`, `admin` | - |
| **type** | Transaction | `ORDER_PAYMENT`, `COMMISSION_EARNING`, `WITHDRAWAL`, `REFUND` | - |
| **status** | Transaction, Withdrawal | `PENDING`, `COMPLETED`, `FAILED` | `PENDING` |

---

## 📋 Detailed Enum Definitions

### UserRole
```javascript
{
  ADMIN: "ADMIN",       // System administrator
  RESELLER: "RESELLER"  // Data bundle reseller
}
```

**Usage**: User authentication, authorization, role-based access control

---

### UserStatus
```javascript
{
  PENDING: "PENDING",       // Awaiting admin approval (new registration)
  ACTIVE: "ACTIVE",         // Approved and can login
  SUSPENDED: "SUSPENDED",   // Temporarily disabled by admin
  REJECTED: "REJECTED"      // Application rejected by admin
}
```

**Usage**: User account state management, login checks

**Flow**:
```
PENDING → ACTIVE (admin approves)
PENDING → REJECTED (admin rejects)
ACTIVE → SUSPENDED (admin suspends)
SUSPENDED → ACTIVE (admin reactivates)
```

---

### Network
```javascript
{
  MTN: "MTN",           // MTN Ghana
  TELECEL: "TELECEL",   // Telecel Ghana (formerly Vodafone)
  AT: "AT"              // AirtelTigo Ghana
}
```

**Usage**: Bundle network selection, order processing

**Associated Phone Prefixes**:
- MTN: 024, 025, 054, 055
- Telecel: 020, 050
- AirtelTigo: 027, 057

---

### OrderStatus
```javascript
{
  ACCEPTED: "ACCEPTED",       // Order received and validated
  PROCESSING: "PROCESSING",   // Order being fulfilled
  DELIVERED: "DELIVERED",     // Bundle delivered to customer
  FAILED: "FAILED",           // Delivery failed
  REFUNDED: "REFUNDED"        // Payment refunded to customer
}
```

**Usage**: Order lifecycle tracking

**Flow**:
```
ACCEPTED → PROCESSING → DELIVERED (success path)
ACCEPTED → PROCESSING → FAILED (failure path)
FAILED → REFUNDED (refund processed)
```

---

### PaymentStatus
```javascript
{
  PENDING: "PENDING",   // Payment not yet received
  PAID: "PAID",         // Payment confirmed
  FAILED: "FAILED",     // Payment failed
  REFUNDED: "REFUNDED"  // Payment refunded
}
```

**Usage**: Payment tracking, order validation

**Flow**:
```
PENDING → PAID (payment successful)
PENDING → FAILED (payment failed)
PAID → REFUNDED (refund issued)
```

---

### PricingMode
```javascript
{
  PRESET: "PRESET",   // Use preset commission (e.g., 5%)
  CUSTOM: "CUSTOM"    // Use custom pricing per bundle
}
```

**Usage**: Reseller pricing configuration

**Behavior**:
- `PRESET`: All bundles use `presetCommission` value
- `CUSTOM`: Each bundle has individual pricing in `ResellerPricing` table

---

### TicketStatus
```javascript
{
  OPEN: "OPEN",               // New ticket, not yet assigned
  IN_PROGRESS: "IN_PROGRESS", // Admin working on ticket
  RESOLVED: "RESOLVED",       // Issue resolved
  CLOSED: "CLOSED"            // Ticket closed (can't reopen)
}
```

**Usage**: Support ticket lifecycle

**Flow**:
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
```

---

### TransactionType
```javascript
{
  ORDER_PAYMENT: "ORDER_PAYMENT",           // Customer pays for order
  COMMISSION_EARNING: "COMMISSION_EARNING", // Reseller earns commission
  WITHDRAWAL: "WITHDRAWAL",                 // Reseller withdraws earnings
  REFUND: "REFUND"                          // Refund to customer
}
```

**Usage**: Transaction categorization, financial reporting

---

### TransactionStatus
```javascript
{
  PENDING: "PENDING",       // Transaction initiated
  COMPLETED: "COMPLETED",   // Transaction successful
  FAILED: "FAILED"          // Transaction failed
}
```

**Usage**: Transaction processing status

---

## 🔍 Validation Examples

### Import Constants
```javascript
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
} = require('./src/constants');
```

### Using Enums in Code

#### ✅ Correct Usage
```javascript
// Creating a user
const user = await prisma.user.create({
  data: {
    name: "John Doe",
    email: "john@example.com",
    role: UserRole.RESELLER,      // ✅ Use constant
    status: UserStatus.PENDING     // ✅ Use constant
  }
});

// Checking user status
if (user.status === UserStatus.ACTIVE) {
  // Allow login
}

// Creating an order
const order = await prisma.order.create({
  data: {
    network: Network.MTN,              // ✅ Use constant
    status: OrderStatus.ACCEPTED,      // ✅ Use constant
    paymentStatus: PaymentStatus.PENDING  // ✅ Use constant
  }
});
```

#### ❌ Incorrect Usage
```javascript
// DON'T do this - hardcoded strings are error-prone
const user = await prisma.user.create({
  data: {
    role: "RESELLER",      // ❌ Typos possible
    status: "PENDING"      // ❌ No IDE autocomplete
  }
});

// DON'T do this - lowercase won't match
if (user.status === "active") {  // ❌ Should be "ACTIVE"
  // Won't work!
}
```

---

## 🛡️ Runtime Validation

### Using Validation Helpers

```javascript
const {
  isValidEnum,
  assertValidEnum,
  isValidUserRole,
  isValidOrderStatus,
  isValidNetwork
} = require('./src/types/validation');

// Check if value is valid
if (isValidUserRole(role)) {
  // Safe to use
}

// Assert value is valid (throws error if not)
assertValidEnum(status, OrderStatus, "order status");
// Throws: "Invalid order status: "INVALID". Must be one of: ACCEPTED, PROCESSING, DELIVERED, FAILED, REFUNDED"

// Specific validators
if (isValidNetwork("MTN")) {  // true
if (isValidNetwork("mtn")) {  // false (case sensitive)
if (isValidOrderStatus("DELIVERED")) {  // true
```

---

## 🔄 Frontend Integration

### Transforming for Frontend

The backend stores enums in UPPERCASE, but frontend might use lowercase:

```javascript
// Backend → Frontend (in response.util.js)
const transformForFrontend = (data) => {
  return {
    ...data,
    role: data.role.toLowerCase(),      // "ADMIN" → "admin"
    status: data.status.toLowerCase(),  // "ACTIVE" → "active"
    network: data.network.toLowerCase() // "MTN" → "mtn"
  };
};

// Frontend → Backend (in validators.js)
const createOrderSchema = z.object({
  network: z.string()
    .transform(val => val.toUpperCase())  // "mtn" → "MTN"
    .refine(val => ["MTN", "TELECEL", "AT"].includes(val))
});
```

---

## 📝 Common Patterns

### Pattern 1: Status Transitions
```javascript
const canTransitionOrderStatus = (currentStatus, newStatus) => {
  const validTransitions = {
    [OrderStatus.ACCEPTED]: [OrderStatus.PROCESSING],
    [OrderStatus.PROCESSING]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
    [OrderStatus.FAILED]: [OrderStatus.REFUNDED],
    [OrderStatus.DELIVERED]: [], // Terminal state
    [OrderStatus.REFUNDED]: []   // Terminal state
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// Usage
if (canTransitionOrderStatus(order.status, OrderStatus.DELIVERED)) {
  // Update allowed
}
```

### Pattern 2: Enum to Display Text
```javascript
const getStatusLabel = (status) => {
  const labels = {
    [OrderStatus.ACCEPTED]: "Order Accepted",
    [OrderStatus.PROCESSING]: "Processing Order",
    [OrderStatus.DELIVERED]: "Delivered",
    [OrderStatus.FAILED]: "Delivery Failed",
    [OrderStatus.REFUNDED]: "Refunded"
  };
  
  return labels[status] || status;
};

// Usage
console.log(getStatusLabel(OrderStatus.DELIVERED)); // "Delivered"
```

### Pattern 3: Filtering by Enum
```javascript
// Get all active users
const activeUsers = await prisma.user.findMany({
  where: { status: UserStatus.ACTIVE }
});

// Get all MTN orders
const mtnOrders = await prisma.order.findMany({
  where: { network: Network.MTN }
});

// Get completed transactions
const completedTransactions = await prisma.transaction.findMany({
  where: { status: TransactionStatus.COMPLETED }
});
```

---

## 🎨 Color Coding (for UI)

Suggested colors for status indicators:

### User Status
- `PENDING`: 🟡 Yellow/Orange (#FFA500)
- `ACTIVE`: 🟢 Green (#22C55E)
- `SUSPENDED`: 🟠 Orange/Red (#FF6B6B)
- `REJECTED`: 🔴 Red (#EF4444)

### Order Status
- `ACCEPTED`: 🔵 Blue (#3B82F6)
- `PROCESSING`: 🟡 Yellow (#EAB308)
- `DELIVERED`: 🟢 Green (#22C55E)
- `FAILED`: 🔴 Red (#EF4444)
- `REFUNDED`: 🟣 Purple (#A855F7)

### Payment Status
- `PENDING`: 🟡 Yellow (#EAB308)
- `PAID`: 🟢 Green (#22C55E)
- `FAILED`: 🔴 Red (#EF4444)
- `REFUNDED`: 🟣 Purple (#A855F7)

---

## 🚨 Common Mistakes

### Mistake 1: Case Sensitivity
```javascript
// ❌ Wrong
if (user.role === "admin") { }  // Should be "ADMIN"

// ✅ Correct
if (user.role === UserRole.ADMIN) { }
```

### Mistake 2: Typos
```javascript
// ❌ Wrong
const status = "PROCESING";  // Typo: missing 'S'

// ✅ Correct
const status = OrderStatus.PROCESSING;
```

### Mistake 3: Invalid Values
```javascript
// ❌ Wrong
await prisma.user.update({
  data: { status: "INACTIVE" }  // Not a valid status!
});

// ✅ Correct
await prisma.user.update({
  data: { status: UserStatus.SUSPENDED }
});
```

---

## 📚 Reference Locations

- **Enum Definitions**: `src/constants/index.js`
- **Validation Helpers**: `src/types/validation.js`
- **Zod Schemas**: `src/utils/validators.js`
- **Prisma Schema**: `prisma/schema.prisma`

---

## 🔗 Related Documentation

- [MongoDB Schema Guide](./MONGODB_SCHEMA_GUIDE.md) - Complete validation strategy
- [API Documentation](./API_DOCS.md) - API endpoint specifications
- [Prisma Schema](./prisma/schema.prisma) - Database schema

---

**Last Updated**: 2024
**Project**: JoyBundles Backend
**MongoDB Version**: 6.0+
**Prisma Version**: 6.0+