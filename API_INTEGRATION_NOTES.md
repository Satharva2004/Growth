# API Integration Notes

## Backend Response Structure

Based on the backend controller code, the API returns goals with the following structure:

### Goal Response Object
```json
{
  "id": "string",           // MongoDB _id mapped to id
  "name": "string",
  "amount": number,
  "savedAmount": number,    // Total contributions (NOT currentAmount)
  "remainingAmount": number,
  "description": "string",
  "category": "string",
  "targetDate": "date",
  "isCompleted": boolean,
  "progress": number,       // Calculated percentage (0-100)
  "notes": "string",
  "tags": ["string"],
  "contributions": [
    {
      "amount": number,
      "note": "string",
      "date": "date"
    }
  ],
  "createdAt": "date",
  "updatedAt": "date"
}
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Returns `{ token, user }`
- `POST /api/auth/login` - Returns `{ token, user }`

### Goals
- `GET /api/goals` - Returns `{ goals: [...] }`
- `POST /api/goals` - Create goal (requires `name` and `amount`)
- `GET /api/goals/:id` - Returns `{ goal: {...} }`
- `PUT /api/goals/:id` - Full update (requires `name` AND `amount`)
- `PATCH /api/goals/:id` - Partial update (any allowed fields)
- `DELETE /api/goals/:id` - Delete goal

### Contributions
- `POST /api/goals/:id/contributions` - Add contribution
  - Body: `{ amount: number, note?: string }`

## Allowed Fields for Goal Updates
- name
- amount
- description
- category
- targetDate
- isCompleted
- notes

## Important Notes

1. **Field Naming**: Backend uses `savedAmount` not `currentAmount`
2. **Progress**: Backend calculates and returns `progress` field
3. **ID Field**: Response uses `id` not `_id`
4. **Update Methods**:
   - Use `PUT` only when updating both name AND amount
   - Use `PATCH` for partial updates (e.g., just description)
5. **Amount Validation**: 
   - Must be non-negative
   - Cannot be less than `savedAmount` when updating
6. **Contributions**: Automatically updates `savedAmount` and may set `isCompleted`

## Frontend Changes Made

### Updated Interfaces
- Changed `_id` → `id`
- Changed `currentAmount` → `savedAmount`
- Added: `remainingAmount`, `progress`, `targetDate`, `isCompleted`, `notes`, `tags`

### API Calls
- Goals list: Parse `data.goals` from response
- Goal detail: Use PATCH for description updates
- Progress calculation: Use backend `progress` field when available

### Navigation
- Updated router.push to use `goal.id` instead of `goal._id`
