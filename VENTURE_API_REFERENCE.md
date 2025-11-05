# Venture System API Reference

## Base URL
```
http://localhost:8007/api/v1
```

## Authentication
All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All API responses follow a consistent format:

```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    processingTime: number
  }
}
```

## Endpoints

### 1. Create Venture

**POST** `/ventures`

Creates a new venture for the authenticated user.

#### Request Body
```typescript
{
  name: string                    // Required: Venture name
  description?: string            // Optional: Brief description
  ventureType: string            // Required: 'sovereign_circle' | 'professional' | 'cooperative' | 'solo'
  isGreenfieldAffiliate?: boolean // Optional: For liberation tier qualification
  sovereignCircleId?: string     // Optional: Link to existing circle
  coreValues?: string[]          // Optional: Array of core values
  primaryGoals?: string[]        // Optional: Array of primary goals
  ventureVoice?: string          // Optional: Communication style
  targetAudience?: string        // Optional: Target audience description
  costSharingEnabled?: boolean   // Optional: Enable cost sharing features
  costSharingMethod?: string     // Optional: 'equal' | 'contribution_based' | 'custom'
}
```

#### Example Request
```bash
curl -X POST http://localhost:8007/api/v1/ventures \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Liberation Collective",
    "description": "A sovereign circle for community mutual aid",
    "ventureType": "sovereign_circle",
    "isGreenfieldAffiliate": true,
    "coreValues": ["mutual aid", "liberation", "solidarity"],
    "primaryGoals": ["community support", "resource sharing"]
  }'
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "af0dbe21-37b4-4211-89ad-e67d7dabef36",
    "name": "Liberation Collective",
    "description": "A sovereign circle for community mutual aid",
    "ventureType": "sovereign_circle",
    "primaryBillingOwner": "user-id",
    "billingTier": "liberation",
    "maxMembers": 50,
    "isGreenfieldAffiliate": true,
    "coreValues": ["mutual aid", "liberation", "solidarity"],
    "primaryGoals": ["community support", "resource sharing"],
    "status": "active",
    "currentUserRole": "owner",
    "currentUserPermissions": ["admin_all"],
    "createdAt": "2025-10-14T16:22:26.766Z",
    "updatedAt": "2025-10-14T16:22:26.766Z",
    "lastActivityAt": "2025-10-14T16:22:26.766Z"
  },
  "meta": {
    "timestamp": "2025-10-14T16:22:26.776Z",
    "processingTime": 17
  }
}
```

### 2. List Ventures

**GET** `/ventures`

Retrieves all ventures the authenticated user belongs to.

#### Query Parameters
```
limit?: number          // Default: 20, Max: 100
offset?: number         // Default: 0
ventureType?: string    // Filter by venture type
status?: string         // Filter by status: 'active' | 'archived' | 'suspended'
search?: string         // Search in name and description
sortBy?: string         // 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'name'
sortOrder?: string      // 'asc' | 'desc'
includeMembers?: boolean // Include member details
```

#### Example Request
```bash
curl -X GET "http://localhost:8007/api/v1/ventures?limit=10&ventureType=sovereign_circle" \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "success": true,
  "data": {
    "ventures": [
      {
        "id": "venture-id",
        "name": "Liberation Collective",
        "ventureType": "sovereign_circle",
        "billingTier": "liberation",
        "currentUserRole": "owner",
        "members": [...]
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

### 3. Get Venture Details

**GET** `/ventures/:ventureId`

Retrieves detailed information about a specific venture.

#### Path Parameters
- `ventureId` (UUID): The venture identifier

#### Example Request
```bash
curl -X GET http://localhost:8007/api/v1/ventures/af0dbe21-37b4-4211-89ad-e67d7dabef36 \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "af0dbe21-37b4-4211-89ad-e67d7dabef36",
    "name": "Liberation Collective",
    "description": "A sovereign circle for community mutual aid",
    "ventureType": "sovereign_circle",
    "billingTier": "liberation",
    "maxMembers": 50,
    "currentUserRole": "owner",
    "currentUserPermissions": ["admin_all"],
    "members": [
      {
        "id": "member-id",
        "userId": "user-id",
        "role": "owner",
        "permissions": ["admin_all"],
        "joinedAt": "2025-10-14T16:22:26.766Z"
      }
    ],
    "coreValues": ["mutual aid", "liberation"],
    "primaryGoals": ["community support"]
  }
}
```

### 4. Update Venture

**PATCH** `/ventures/:ventureId`

Updates venture information. Only owners and co-owners with appropriate permissions can update ventures.

#### Request Body
```typescript
{
  name?: string
  description?: string
  coreValues?: string[]
  primaryGoals?: string[]
  ventureVoice?: string
  targetAudience?: string
  costSharingEnabled?: boolean
  costSharingMethod?: string
  costSharingNotes?: string
  status?: 'active' | 'archived' | 'suspended'
}
```

#### Example Request
```bash
curl -X PATCH http://localhost:8007/api/v1/ventures/af0dbe21-37b4-4211-89ad-e67d7dabef36 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "coreValues": ["mutual aid", "liberation", "community care"]
  }'
```

### 5. Invite Team Member

**POST** `/ventures/:ventureId/members/invite`

Invites a new member to join the venture via email.

#### Request Body
```typescript
{
  email: string                    // Required: Email address of invitee
  role: string                     // Required: 'co_owner' | 'contributor' | 'collaborator' | 'observer'
  permissions?: string[]           // Optional: Custom permissions array
  costSharePercentage?: number     // Optional: Percentage for cost sharing (0-100)
  personalMessage?: string         // Optional: Personal message to include
}
```

#### Example Request
```bash
curl -X POST http://localhost:8007/api/v1/ventures/af0dbe21-37b4-4211-89ad-e67d7dabef36/members/invite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@example.com",
    "role": "contributor",
    "permissions": ["create_conversations", "access_analytics"],
    "personalMessage": "Join our liberation collective!"
  }'
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "invitation-id",
    "ventureId": "af0dbe21-37b4-4211-89ad-e67d7dabef36",
    "invitedEmail": "member@example.com",
    "role": "contributor",
    "invitationToken": "secure-token",
    "expiresAt": "2025-10-21T16:22:26.766Z",
    "status": "pending",
    "createdAt": "2025-10-14T16:22:26.766Z"
  }
}
```

### 6. Get Venture Statistics

**GET** `/ventures/:ventureId/stats`

Retrieves analytics and statistics for a venture.

#### Example Request
```bash
curl -X GET http://localhost:8007/api/v1/ventures/af0dbe21-37b4-4211-89ad-e67d7dabef36/stats \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "success": true,
  "data": {
    "members": 3,
    "conversations": 15,
    "messages": 247,
    "lastActivity": "2025-10-14T15:30:00Z",
    "monthlyActivity": {
      "conversations": 8,
      "messages": 156,
      "activeMembers": 2
    }
  }
}
```

### 7. Archive Venture

**DELETE** `/ventures/:ventureId`

Archives a venture (soft delete). Only venture owners can archive ventures.

#### Example Request
```bash
curl -X DELETE http://localhost:8007/api/v1/ventures/af0dbe21-37b4-4211-89ad-e67d7dabef36 \
  -H "Authorization: Bearer <token>"
```

#### Response
```json
{
  "success": true,
  "data": {
    "archived": true
  }
}
```

## Error Responses

### Common Error Codes

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid venture data",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Insufficient permissions to perform this action"
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "VENTURE_NOT_FOUND",
    "message": "Venture not found or access denied"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Venture Types

### Sovereign Circle 🤝
- **Purpose**: Liberation-focused community groups
- **Billing**: Liberation tier (free for affiliates)
- **Max Members**: 50
- **Features**: Mutual aid coordination, solidarity networks

### Professional 💼
- **Purpose**: Traditional business ventures
- **Billing**: Professional tier (paid)
- **Max Members**: 5
- **Features**: Full feature access, team collaboration

### Cooperative 🔗
- **Purpose**: Collective ownership structures
- **Billing**: Professional tier
- **Max Members**: 10
- **Features**: Cost sharing tools, democratic governance

### Solo 👤
- **Purpose**: Individual practitioners
- **Billing**: Professional tier
- **Max Members**: 1
- **Features**: Personal productivity focus

## Member Roles & Permissions

### Owner 👑
- Full administrative access
- Billing management
- Can archive venture
- Default permissions: `["admin_all"]`

### Co-Owner 🤝
- Management capabilities
- Cannot manage billing
- Can invite/remove members
- Suggested permissions: `["manage_members", "create_conversations", "access_analytics"]`

### Contributor ✍️
- Content creation access
- Project participation
- Suggested permissions: `["create_conversations", "access_analytics"]`

### Collaborator 🤝
- Limited participation
- Can view and comment
- Suggested permissions: `["create_conversations"]`

### Observer 👁️
- Read-only access
- No creation permissions
- Suggested permissions: `[]`

## Rate Limits

- **Venture Creation**: 10 per hour per user
- **Member Invitations**: 50 per day per venture
- **API Calls**: 1000 per hour per user

## Webhooks (Future)

Webhook endpoints for venture events:
- `venture.created`
- `venture.updated`
- `member.invited`
- `member.joined`
- `member.removed`

---

*This API reference covers all venture-related endpoints. For authentication endpoints and other features, see the main API documentation.*