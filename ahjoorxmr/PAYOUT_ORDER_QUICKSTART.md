# Payout Order Strategies - Quick Start Guide

## Installation

1. **Run the migration:**
   ```bash
   npm run migration:run
   ```

2. **Verify the migration:**
   ```bash
   # Check that the groups table has payoutOrderStrategy column
   # Check that memberships.payoutOrder allows NULL
   ```

## Usage Examples

### Example 1: SEQUENTIAL Strategy (Default)

```bash
# 1. Create a group (defaults to SEQUENTIAL)
curl -X POST http://localhost:3000/api/v1/groups \
  -H "Content-Type: application/json"

# Response: { "id": "group-123", "status": "PENDING", "payoutOrderStrategy": "SEQUENTIAL" }

# 2. Add members
curl -X POST http://localhost:3000/api/v1/groups/group-123/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "walletAddress": "0xABC..."}'
# Response: { "payoutOrder": 0, ... }

curl -X POST http://localhost:3000/api/v1/groups/group-123/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-2", "walletAddress": "0xDEF..."}'
# Response: { "payoutOrder": 1, ... }

curl -X POST http://localhost:3000/api/v1/groups/group-123/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-3", "walletAddress": "0xGHI..."}'
# Response: { "payoutOrder": 2, ... }

# 3. Activate the group
curl -X POST http://localhost:3000/groups/group-123/activate

# Result: Payout orders remain 0, 1, 2 (in join order)
```

### Example 2: RANDOM Strategy

```bash
# 1. Create a group with RANDOM strategy
curl -X POST http://localhost:3000/api/v1/groups \
  -H "Content-Type: application/json" \
  -d '{"payoutOrderStrategy": "RANDOM"}'

# Response: { "id": "group-456", "status": "PENDING", "payoutOrderStrategy": "RANDOM" }

# 2. Add members
curl -X POST http://localhost:3000/api/v1/groups/group-456/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "walletAddress": "0xABC..."}'
# Response: { "payoutOrder": null, ... }

curl -X POST http://localhost:3000/api/v1/groups/group-456/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-2", "walletAddress": "0xDEF..."}'
# Response: { "payoutOrder": null, ... }

curl -X POST http://localhost:3000/api/v1/groups/group-456/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-3", "walletAddress": "0xGHI..."}'
# Response: { "payoutOrder": null, ... }

# 3. Activate the group
curl -X POST http://localhost:3000/groups/group-456/activate

# Result: Payout orders randomly assigned (e.g., 2, 0, 1)

# 4. Verify the randomized order
curl -X GET http://localhost:3000/api/v1/groups/group-456/members
# Response: Members with randomized payoutOrder values
```

### Example 3: ADMIN_DEFINED Strategy

```bash
# 1. Create a group with ADMIN_DEFINED strategy
curl -X POST http://localhost:3000/api/v1/groups \
  -H "Content-Type: application/json" \
  -d '{"payoutOrderStrategy": "ADMIN_DEFINED"}'

# Response: { "id": "group-789", "status": "PENDING", "payoutOrderStrategy": "ADMIN_DEFINED" }

# 2. Add members
curl -X POST http://localhost:3000/api/v1/groups/group-789/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1", "walletAddress": "0xABC..."}'
# Response: { "payoutOrder": null, ... }

curl -X POST http://localhost:3000/api/v1/groups/group-789/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-2", "walletAddress": "0xDEF..."}'
# Response: { "payoutOrder": null, ... }

curl -X POST http://localhost:3000/api/v1/groups/group-789/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-3", "walletAddress": "0xGHI..."}'
# Response: { "payoutOrder": null, ... }

# 3. Assign payout orders manually
curl -X PATCH http://localhost:3000/api/v1/groups/group-789/members/user-1/payout-order \
  -H "Content-Type: application/json" \
  -d '{"payoutOrder": 2}'

curl -X PATCH http://localhost:3000/api/v1/groups/group-789/members/user-2/payout-order \
  -H "Content-Type: application/json" \
  -d '{"payoutOrder": 0}'

curl -X PATCH http://localhost:3000/api/v1/groups/group-789/members/user-3/payout-order \
  -H "Content-Type: application/json" \
  -d '{"payoutOrder": 1}'

# 4. Activate the group
curl -X POST http://localhost:3000/groups/group-789/activate

# Result: Payout orders as assigned (user-2: 0, user-3: 1, user-1: 2)
```

## Common Errors

### Error: Group Already Active
```json
{
  "statusCode": 400,
  "message": "Group is already active"
}
```
**Solution:** Cannot modify memberships or activate an already active group.

### Error: Incomplete Admin-Defined Orders
```json
{
  "statusCode": 400,
  "message": "ADMIN_DEFINED strategy requires all positions 0 to 2 to be assigned. Found: 0, 1"
}
```
**Solution:** Assign payout orders to all members before activation.

### Error: Cannot Modify Active Group
```json
{
  "statusCode": 400,
  "message": "Cannot modify memberships for an active group"
}
```
**Solution:** All membership changes must be done before activation.

### Error: Wrong Strategy for Manual Update
```json
{
  "statusCode": 400,
  "message": "Payout order can only be manually set for groups with ADMIN_DEFINED strategy"
}
```
**Solution:** Only ADMIN_DEFINED groups allow manual payout order updates.

## Testing Checklist

- [ ] Migration runs successfully
- [ ] Can create group with SEQUENTIAL strategy
- [ ] Can create group with RANDOM strategy
- [ ] Can create group with ADMIN_DEFINED strategy
- [ ] SEQUENTIAL assigns orders automatically (0, 1, 2, ...)
- [ ] RANDOM assigns null initially, randomizes on activation
- [ ] ADMIN_DEFINED allows manual order assignment
- [ ] ADMIN_DEFINED validates all positions before activation
- [ ] Cannot modify memberships after activation
- [ ] Cannot activate group with no members
- [ ] Cannot activate already active group

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/groups` | POST | Create group with strategy |
| `/api/v1/groups/:id/members` | POST | Add member to group |
| `/api/v1/groups/:id/members` | GET | List all members |
| `/api/v1/groups/:id/members/:userId` | DELETE | Remove member |
| `/api/v1/groups/:id/members/:userId/payout-order` | PATCH | Update payout order (ADMIN_DEFINED only) |
| `/groups/:id/activate` | POST | Activate group and assign orders |

## Next Steps

1. **Add Authorization:** Restrict admin endpoints to authorized users
2. **Add Audit Logging:** Track all payout order changes
3. **Add Webhooks:** Notify members when group is activated
4. **Add UI:** Build admin interface for managing payout orders
5. **Add Analytics:** Track strategy usage and fairness metrics

## Support

For detailed documentation, see:
- `PAYOUT_ORDER_STRATEGIES.md` - Complete strategy documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `migrations/README.md` - Database migration guide
