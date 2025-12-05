# 🔄 Mongoose Migration Guide

## Overview

This guide documents the migration from Prisma to Mongoose for the JoyBundles backend.

---

## ✅ What's Been Completed

### 1. Dependencies Updated
- ✅ Removed: `prisma`, `@prisma/client`
- ✅ Added: `mongoose@^8.0.0`
- ✅ Updated: `package.json` scripts (removed Prisma commands)

### 2. Database Configuration
- ✅ `src/config/database.js` - Complete Mongoose connection setup
- ✅ Connection pooling configured
- ✅ Event listeners for connection status
- ✅ Graceful shutdown handling
- ✅ Health check functions

### 3. Mongoose Models Created
- ✅ **User** (`src/models/User.js`) - Complete with validation, virtuals, methods
- ✅ **Reseller** (`src/models/Reseller.js`) - Complete with business logic
- ✅ **Bundle** (`src/models/Bundle.js`) - Complete with pricing logic
- ✅ **RefreshToken** (`src/models/RefreshToken.js`) - Complete with TTL index
- ✅ **Models Index** (`src/models/index.js`) - Central export

### 4. Models Needing Implementation
- ⏳ Order
- ⏳ ResellerPricing
- ⏳ OrderStatusHistory
- ⏳ Transaction
- ⏳ SupportTicket
- ⏳ SupportMessage
- ⏳ Withdrawal
- ⏳ PasswordReset
- ⏳ SystemSetting
- ⏳ ApiLog

---

## 🚀 Next Steps

### Step 1: Install Dependencies

```bash
# Remove Prisma
npm uninstall prisma @prisma/client

# Install Mongoose
npm install mongoose

# Install all dependencies
npm install
```

### Step 2: Update Services

You need to update all service files to use Mongoose instead of Prisma.

#### Before (Prisma):
```javascript
const { prisma } = require('../config/database');

const user = await prisma.user.findUnique({
  where: { email },
  include: { reseller: true }
});
```

#### After (Mongoose):
```javascript
const { User } = require('../models');

const user = await User.findOne({ email })
  .populate('reseller');
```

### Step 3: Update Auth Service

**File**: `src/services/auth.service.js`

#### Changes Needed:

1. **Import Models Instead of Prisma**:
```javascript
// Remove:
const { prisma } = require('../config/database');

// Add:
const { User, Reseller, RefreshToken } = require('../models');
```

2. **Update Register Function**:
```javascript
// OLD (Prisma):
const user = await prisma.user.create({
  data: {
    name, email, phone, password: hashedPassword,
    role: UserRole.RESELLER,
    status: UserStatus.PENDING,
    reseller: {
      create: {
        resellerId,
        referralCode,
        pricingMode: "PRESET",
        presetCommission: 5.0
      }
    }
  },
  include: { reseller: true }
});

// NEW (Mongoose):
const user = await User.create({
  name,
  email,
  phone,
  password: hashedPassword,
  role: UserRole.RESELLER,
  status: UserStatus.PENDING
});

const reseller = await Reseller.create({
  userId: user._id,
  resellerId,
  referralCode,
  pricingMode: "PRESET",
  presetCommission: 5.0
});

// Populate reseller
await user.populate('reseller');
```

3. **Update Login Function**:
```javascript
// OLD (Prisma):
const user = await prisma.user.findUnique({
  where: { email: email.toLowerCase() },
  include: { reseller: true }
});

// NEW (Mongoose):
const user = await User.findByEmailWithPassword(email)
  .populate('reseller');
```

4. **Update Password Verification**:
```javascript
// Same - bcrypt works the same way
const isPasswordValid = await comparePassword(password, user.password);
```

5. **Update Refresh Token Creation**:
```javascript
// OLD (Prisma):
await prisma.refreshToken.create({
  data: {
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
});

// NEW (Mongoose):
await RefreshToken.create({
  userId: user._id,
  token: tokens.refreshToken,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});
```

6. **Update User Status Check**:
```javascript
// OLD (Prisma):
if (user.status === UserStatus.PENDING) {
  throw createError(ErrorMessages.USER_PENDING_APPROVAL, HttpStatus.FORBIDDEN);
}

// NEW (Mongoose) - Can use instance method:
if (user.isPending()) {
  throw createError(ErrorMessages.USER_PENDING_APPROVAL, HttpStatus.FORBIDDEN);
}
```

### Step 4: Update User Service

**File**: `src/services/user.service.js`

#### Key Changes:

1. **Import Models**:
```javascript
const { User, Reseller } = require('../models');
```

2. **Update getUserById**:
```javascript
// OLD (Prisma):
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { reseller: true }
});

// NEW (Mongoose):
const user = await User.findById(userId)
  .populate('reseller');
```

3. **Update getAllUsers**:
```javascript
// OLD (Prisma):
const users = await prisma.user.findMany({
  where,
  skip,
  take,
  orderBy: { [sortBy]: sortOrder },
  include: { reseller: true }
});

// NEW (Mongoose):
const users = await User.find(where)
  .skip(skip)
  .limit(take)
  .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
  .populate('reseller');
```

4. **Update Filtering**:
```javascript
// OLD (Prisma):
const where = {};
if (role) where.role = role;
if (status) where.status = status;
if (search) {
  where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search } }
  ];
}

// NEW (Mongoose):
const where = {};
if (role) where.role = role;
if (status) where.status = status;
if (search) {
  where.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { phone: { $regex: search } }
  ];
}
```

5. **Update User Update**:
```javascript
// OLD (Prisma):
const updatedUser = await prisma.user.update({
  where: { id: userId },
  data: updateData,
  include: { reseller: true }
});

// NEW (Mongoose):
const updatedUser = await User.findByIdAndUpdate(
  userId,
  updateData,
  { new: true, runValidators: true }
).populate('reseller');
```

6. **Update User Delete (Soft Delete)**:
```javascript
// OLD (Prisma):
await prisma.user.update({
  where: { id: userId },
  data: { status: UserStatus.SUSPENDED }
});

// NEW (Mongoose):
await User.findByIdAndUpdate(userId, {
  status: UserStatus.SUSPENDED
});
```

7. **Update Reseller Approval**:
```javascript
// OLD (Prisma):
const updatedUser = await prisma.user.update({
  where: { id: userId },
  data: {
    status: UserStatus.ACTIVE,
    reseller: {
      update: {
        approvedById: requestingUser.id,
        approvedAt: new Date()
      }
    }
  },
  include: { reseller: true }
});

// NEW (Mongoose):
const user = await User.findById(userId);
user.status = UserStatus.ACTIVE;
await user.save();

const reseller = await Reseller.findOne({ userId });
await reseller.approve(requestingUser.id);

await user.populate('reseller');
```

---

## 📝 Prisma vs Mongoose Query Comparison

| Operation | Prisma | Mongoose |
|-----------|--------|----------|
| **Find One** | `prisma.user.findUnique({ where: { id } })` | `User.findById(id)` |
| **Find Many** | `prisma.user.findMany({ where })` | `User.find(where)` |
| **Create** | `prisma.user.create({ data })` | `User.create(data)` |
| **Update** | `prisma.user.update({ where, data })` | `User.findByIdAndUpdate(id, data)` |
| **Delete** | `prisma.user.delete({ where })` | `User.findByIdAndDelete(id)` |
| **Count** | `prisma.user.count({ where })` | `User.countDocuments(where)` |
| **Include** | `include: { reseller: true }` | `.populate('reseller')` |
| **OrderBy** | `orderBy: { createdAt: 'desc' }` | `.sort({ createdAt: -1 })` |
| **Pagination** | `skip: 10, take: 20` | `.skip(10).limit(20)` |
| **OR Query** | `OR: [{ a }, { b }]` | `$or: [{ a }, { b }]` |
| **Contains** | `contains: search` | `$regex: search, $options: 'i'` |

---

## 🔧 Common Patterns

### Pattern 1: Transaction/Session (for atomic operations)

**Mongoose**:
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const user = await User.create([{ name, email }], { session });
  const reseller = await Reseller.create([{ userId: user[0]._id }], { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Pattern 2: Populate Multiple Levels

```javascript
const user = await User.findById(userId)
  .populate({
    path: 'reseller',
    populate: {
      path: 'orders',
      options: { limit: 10 }
    }
  });
```

### Pattern 3: Conditional Population

```javascript
const query = User.findById(userId);

if (includeReseller) {
  query.populate('reseller');
}

const user = await query;
```

### Pattern 4: Virtual Population

```javascript
// Already set up in User model
const user = await User.findById(userId).populate('reseller');
// reseller is automatically populated via virtual
```

---

## 🎯 Benefits of Mongoose

### 1. Built-in Validation
```javascript
name: {
  type: String,
  required: [true, 'Name is required'],
  minlength: [2, 'Name must be at least 2 characters']
}
```

### 2. Middleware/Hooks
```javascript
userSchema.pre('save', function(next) {
  this.email = this.email.toLowerCase();
  next();
});
```

### 3. Instance Methods
```javascript
userSchema.methods.isActive = function() {
  return this.status === UserStatus.ACTIVE;
};

// Usage:
if (user.isActive()) { ... }
```

### 4. Static Methods
```javascript
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Usage:
const user = await User.findByEmail('test@example.com');
```

### 5. Virtuals (Computed Fields)
```javascript
userSchema.virtual('fullInfo').get(function() {
  return `${this.name} (${this.email})`;
});

// Usage:
console.log(user.fullInfo);
```

---

## 🚨 Important Notes

### 1. ID Field Differences
- **Prisma**: `user.id` (string)
- **Mongoose**: `user._id` (ObjectId) or `user.id` (string getter)

**Best Practice**: Use `user._id` for consistency

### 2. Decimal128 vs Decimal
- **Prisma**: Returns `Decimal` type
- **Mongoose**: Returns `Decimal128`, needs `.toString()` to convert

**Solution**: Use getters in schema:
```javascript
get: (value) => (value ? parseFloat(value.toString()) : 0)
```

### 3. Enum Validation
- **Prisma**: Native enum support
- **Mongoose**: String with enum validator

**Both work the same in application code** - use constants from `src/constants/index.js`

### 4. Unique Constraints
- **Prisma**: Enforced at database level via migrations
- **Mongoose**: Enforced via index, but may need manual handling

**Best Practice**: Check existence before creating:
```javascript
if (await User.emailExists(email)) {
  throw new Error('Email already exists');
}
```

### 5. Timestamps
- **Prisma**: `createdAt`, `updatedAt` (explicit in schema)
- **Mongoose**: Auto-added with `timestamps: true`

---

## 📊 Testing Changes

### 1. Test Database Connection
```javascript
npm run dev
// Should see: "✅ MongoDB connected successfully"
```

### 2. Test User Creation
```javascript
const { User } = require('./src/models');

const user = await User.create({
  name: "Test User",
  email: "test@example.com",
  phone: "0241234567",
  password: "hashed_password",
  role: "RESELLER",
  status: "PENDING"
});

console.log(user._id); // Should print ObjectId
```

### 3. Test Relationships
```javascript
const user = await User.findById(userId).populate('reseller');
console.log(user.reseller); // Should show reseller data
```

---

## 🔄 Remaining Models to Implement

Create these models following the same pattern as User, Reseller, Bundle:

### 1. Order.js
```javascript
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customerPhone: { type: String, required: true },
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle' },
  resellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reseller' },
  network: { type: String, enum: Object.values(Network) },
  status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.ACCEPTED },
  // ... rest of fields
}, { timestamps: true });
```

### 2. ResellerPricing.js
```javascript
const resellerPricingSchema = new mongoose.Schema({
  resellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reseller' },
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bundle' },
  commission: { type: mongoose.Schema.Types.Decimal128 },
  sellingPrice: { type: mongoose.Schema.Types.Decimal128 },
}, { timestamps: true });

// Compound unique index
resellerPricingSchema.index({ resellerId: 1, bundleId: 1 }, { unique: true });
```

### 3. Transaction.js
```javascript
const transactionSchema = new mongoose.Schema({
  transactionNumber: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: { type: String, enum: Object.values(TransactionType) },
  amount: { type: mongoose.Schema.Types.Decimal128 },
  status: { type: String, enum: Object.values(TransactionStatus) },
  // ... rest of fields
}, { timestamps: true });
```

### 4. OrderStatusHistory.js
```javascript
const orderStatusHistorySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  status: { type: String, enum: Object.values(OrderStatus), required: true },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});
```

### 5. SupportTicket.js
```javascript
const supportTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customerPhone: String,
  message: String,
  status: { type: String, enum: Object.values(TicketStatus), default: TicketStatus.OPEN },
  priority: { type: String, default: 'medium' },
  assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, { timestamps: true });
```

### 6. SupportMessage.js
### 7. Withdrawal.js
### 8. PasswordReset.js (similar to RefreshToken)
### 9. SystemSetting.js
### 10. ApiLog.js

---

## ✅ Validation & Type Safety

### Good News!
All your existing validation remains the same:
- ✅ `src/constants/index.js` - No changes needed
- ✅ `src/utils/validators.js` - No changes needed (Zod works the same)
- ✅ `src/types/validation.js` - No changes needed
- ✅ `src/middleware/` - No changes needed
- ✅ `src/utils/response.util.js` - No changes needed

**Mongoose adds an extra layer** of validation at the schema level!

---

## 🎉 Summary

### Migration Checklist

- [x] Update `package.json` dependencies
- [x] Create Mongoose database configuration
- [x] Create core models (User, Reseller, Bundle, RefreshToken)
- [ ] Create remaining 10 models
- [ ] Update `auth.service.js`
- [ ] Update `user.service.js`
- [ ] Test authentication flow
- [ ] Test user CRUD operations
- [ ] Update controllers (if needed)
- [ ] Integration testing

### Key Advantages
1. ✅ **Native MongoDB** - Full access to MongoDB features
2. ✅ **Built-in Validation** - Schema-level validation
3. ✅ **Middleware** - Pre/post hooks for business logic
4. ✅ **Virtuals** - Computed fields
5. ✅ **Instance Methods** - Object-oriented approach
6. ✅ **Static Methods** - Model-level utilities
7. ✅ **Better Performance** - Direct MongoDB driver
8. ✅ **More Flexible** - Easier to customize

---

## 📚 Resources

- **Mongoose Docs**: https://mongoosejs.com/docs/guide.html
- **Mongoose Schemas**: https://mongoosejs.com/docs/guide.html
- **Mongoose Queries**: https://mongoosejs.com/docs/queries.html
- **Mongoose Middleware**: https://mongoosejs.com/docs/middleware.html
- **Mongoose Validation**: https://mongoosejs.com/docs/validation.html
- **MongoDB ObjectId**: https://docs.mongodb.com/manual/reference/method/ObjectId/

---

**Migration Status**: 40% Complete (Core models and config done, services and remaining models pending)

**Next Step**: Implement remaining models and update service layers

---

Generated: 2024
Project: JoyBundles Backend
MongoDB + Mongoose Migration