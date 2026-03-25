# Payout Order Strategies

This document describes the payout order strategies available for ROSCA groups in the ahjoorxmr system.

## Overview

The payout order determines the sequence in which members receive their payouts in a ROSCA (Rotating Savings and Credit Association) group. Three strategies are available:

1. **SEQUENTIAL** - First-join, first-payout (default)
2. **RANDOM** - Randomized at group activation
3. **ADMIN_DEFINED** - Manually assigned by administrators

## Strategy Details

### SEQUENTIAL (Default)

Members receive payout positions in the order they join the group.

- **Assignment**: Automatic, at member addition time
- **Payout Order**: 0, 1, 2, 3, ... (in join order)
- **Use Case**: Simple, predictable ordering
- **Fairness**: May favor early joiners

**Example Flow:**
```
1. Alice joins → payoutOrder = 0
2. Bob joins → payoutOrder = 1
3. Carol joins → payoutOrder = 2
4. Group activates → orders remain unchanged
```

### RANDOM

Payout positions are randomly shuffled when the group is activated.

- **Assignment**: At group activation (Fisher-Yates shuffle)
- **Payout Order**: Randomized positions 0 to N-1
- **Use Case**: Fair distribution, no advantage to early joiners
- **Fairness**: Equal probability for all members

**Example Flow:**
```
1. Alice joins → payoutOrder = null
2. Bob joins → payoutOrder = null
3. Carol joins → payoutOrder = null
4. Group activates → Random shuffle
   - Alice → payoutOrder = 2
   - Bob → payoutOrder = 0
   - Carol → payoutOrder = 1
```

### ADMIN_DEFINED

Administrators manually assign payout positions before activation.

- **Assignment**: Manual, via API endpoint
- **Payout Order**: Admin-specified positions 0 to N-1
- **Use Case**: Custom ordering based on specific criteria
- **Validation**: All positions 0 to N-1 must be assigned and unique

**Example Flow:**
```
1. Alice joins → payoutOrder = null
2. Bob joins → payoutOrder = null
3. Carol joins → payoutOrder = null
4. Admin sets Alice → payoutOrder = 1
5. Admin sets Bob → payoutOrder = 2
6. Admin sets Carol → payoutOrder = 0
7. Group activates → Validates all positions assigned
```

## API Endpoints

### Create Group with Strategy

```http
POST /api/v1/groups
Content-Type: application/json

{
  "payoutOrderStrategy": "RANDOM"
}
```

### Add Member

```http
POST /api/v1/groups/{groupId}/members
Content-Type: application/json

{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
- SEQUENTIAL: `payoutOrder` is assigned (0, 1, 2, ...)
- RANDOM/ADMIN_DEFINED: `payoutOrder` is `null`

### Update Payout Order (ADMIN_DEFINED only)

```http
PATCH /api/v1/groups/{groupId}/members/{userId}/payout-order
Content-Type: application/json

{
  "payoutOrder": 0
}
```

**Restrictions:**
- Only allowed for ADMIN_DEFINED strategy
- Only allowed before group activation
- Must assign unique positions

### Activate Group

```http
POST /groups/{groupId}/activate
```

**Behavior by Strategy:**
- **SEQUENTIAL**: No changes, validates existing orders
- **RANDOM**: Shuffles payout orders randomly
- **ADMIN_DEFINED**: Validates all positions 0 to N-1 are assigned

## Validation Rules

### SEQUENTIAL Strategy
- ✅ Payout orders assigned automatically at join time
- ✅ No gaps in sequence (0, 1, 2, 3, ...)
- ✅ No manual updates needed

### RANDOM Strategy
- ✅ Payout orders are null before activation
- ✅ Shuffled randomly at activation using Fisher-Yates algorithm
- ✅ All positions 0 to N-1 assigned after activation
- ❌ Manual payout order updates not allowed

### ADMIN_DEFINED Strategy
- ✅ Payout orders are null initially
- ✅ Admin can set any position 0 to N-1
- ✅ All positions must be assigned before activation
- ✅ No duplicate positions allowed
- ❌ Activation fails if any position is missing or duplicated

## Database Schema

### Groups Table

```sql
ALTER TABLE groups 
ADD COLUMN payoutOrderStrategy varchar(20) NOT NULL DEFAULT 'SEQUENTIAL';
```

### Memberships Table

```sql
ALTER TABLE memberships 
MODIFY COLUMN payoutOrder integer NULL;
```

## Migration

Run the migration to add the new column:

```bash
npm run migration:run
```

The migration:
1. Adds `payoutOrderStrategy` column to `groups` table
2. Modifies `payoutOrder` column in `memberships` to allow NULL
3. Preserves all existing data
4. Sets default strategy to SEQUENTIAL for backward compatibility

## Error Handling

### Common Errors

**400 Bad Request - Group Already Active**
```json
{
  "statusCode": 400,
  "message": "Cannot modify memberships for an active group"
}
```

**400 Bad Request - Invalid Strategy for Manual Update**
```json
{
  "statusCode": 400,
  "message": "Payout order can only be manually set for groups with ADMIN_DEFINED strategy"
}
```

**400 Bad Request - Incomplete Admin-Defined Orders**
```json
{
  "statusCode": 400,
  "message": "ADMIN_DEFINED strategy requires all positions 0 to 2 to be assigned. Found: 0, 1"
}
```

**400 Bad Request - Duplicate Positions**
```json
{
  "statusCode": 400,
  "message": "ADMIN_DEFINED strategy requires unique payout orders for all members"
}
```

## Testing

### Test SEQUENTIAL Strategy

```bash
# Create group (default strategy)
POST /api/v1/groups

# Add members
POST /api/v1/groups/{id}/members
# Member 1: payoutOrder = 0
# Member 2: payoutOrder = 1
# Member 3: payoutOrder = 2

# Activate group
POST /groups/{id}/activate
# Orders remain: 0, 1, 2
```

### Test RANDOM Strategy

```bash
# Create group with RANDOM strategy
POST /api/v1/groups
{ "payoutOrderStrategy": "RANDOM" }

# Add members
POST /api/v1/groups/{id}/members
# All members: payoutOrder = null

# Activate group
POST /groups/{id}/activate
# Orders shuffled randomly
```

### Test ADMIN_DEFINED Strategy

```bash
# Create group with ADMIN_DEFINED strategy
POST /api/v1/groups
{ "payoutOrderStrategy": "ADMIN_DEFINED" }

# Add members
POST /api/v1/groups/{id}/members
# All members: payoutOrder = null

# Set payout orders
PATCH /api/v1/groups/{id}/members/{userId1}/payout-order
{ "payoutOrder": 0 }

PATCH /api/v1/groups/{id}/members/{userId2}/payout-order
{ "payoutOrder": 1 }

PATCH /api/v1/groups/{id}/members/{userId3}/payout-order
{ "payoutOrder": 2 }

# Activate group
POST /groups/{id}/activate
# Validates all positions assigned
```

## Best Practices

1. **Choose the right strategy:**
   - Use SEQUENTIAL for simple, predictable groups
   - Use RANDOM for fair, unbiased distribution
   - Use ADMIN_DEFINED for custom criteria (e.g., need-based)

2. **For ADMIN_DEFINED groups:**
   - Assign all payout orders before attempting activation
   - Ensure no duplicate positions
   - Validate assignments before activation

3. **Security considerations:**
   - Restrict ADMIN_DEFINED updates to authorized administrators
   - Log all payout order changes for audit trail
   - Prevent modifications after group activation

4. **User experience:**
   - Clearly communicate the strategy to members
   - For RANDOM, explain that order is determined at activation
   - For ADMIN_DEFINED, provide transparency on assignment criteria
