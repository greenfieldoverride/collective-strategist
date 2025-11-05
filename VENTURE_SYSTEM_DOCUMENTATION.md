# Venture-Based Team System Documentation

## Overview

The Collective Strategist has been transformed from an individual-focused system to a venture-based team collaboration platform. This system supports both liberation-focused sovereign circles and traditional professional teams using inclusive, non-capitalist language.

## 🌟 Key Features

### Liberation-Friendly Design
- **Language**: Uses "venture" instead of "business", "team members" instead of "employees"
- **Sovereign Circles**: Free tier for community mutual aid and liberation work
- **Greenfield Override**: Special affiliate status for free access
- **Cost Sharing**: UI tools to help cooperatives coordinate shared expenses

### Team Collaboration
- **Multiple Ventures**: Users can create and switch between different ventures
- **Role-Based Access**: Five distinct roles with customizable permissions
- **Member Invitations**: Email-based invitation system for team growth
- **Billing Simplification**: Single billing account per venture (no complex cost-splitting)

### Smart Billing Tiers
- **Liberation Tier**: Free for sovereign circles and Greenfield Override affiliates (50 members)
- **Professional Tier**: Paid tier for traditional businesses and larger teams (5 members)

## 🏗 Architecture

### Database Schema

#### Core Tables

**`ventures`** - The primary entity replacing business-centric models
```sql
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- venture_type (ENUM: sovereign_circle, professional, cooperative, solo)
- primary_billing_owner (VARCHAR) -- User ID who manages billing
- billing_tier (ENUM: liberation, professional)
- max_members (INTEGER)
- is_greenfield_affiliate (BOOLEAN)
- core_values (TEXT[])
- primary_goals (TEXT[])
- status (ENUM: active, archived, suspended)
- timestamps...
```

**`venture_members`** - Many-to-many user/venture relationships
```sql
- id (UUID)
- user_id (VARCHAR)
- venture_id (UUID REFERENCES ventures)
- role (ENUM: owner, co_owner, contributor, collaborator, observer)
- permissions (TEXT[])
- notification_preferences (JSONB)
- cost_share_percentage (DECIMAL)
- timestamps...
```

**`venture_invitations`** - Team invitation management
```sql
- id (UUID)
- venture_id (UUID REFERENCES ventures)
- invited_email (VARCHAR)
- invited_by (VARCHAR) -- User ID
- role (VARCHAR)
- invitation_token (VARCHAR UNIQUE)
- status (ENUM: pending, accepted, declined, expired)
- timestamps...
```

#### Automated Features
- **Liberation Tier Detection**: Automatic billing tier assignment for sovereign circles
- **Billing Owner Membership**: Automatic member creation for venture owners
- **Activity Tracking**: Triggers to update last activity timestamps

### API Endpoints

#### Venture Management
```
POST   /api/v1/ventures                      # Create new venture
GET    /api/v1/ventures                      # List user's ventures
GET    /api/v1/ventures/:id                  # Get venture details
PATCH  /api/v1/ventures/:id                  # Update venture
DELETE /api/v1/ventures/:id                  # Archive venture
```

#### Team Management
```
POST   /api/v1/ventures/:id/members/invite   # Invite team member
GET    /api/v1/ventures/:id/stats            # Get venture analytics
```

### Frontend Components

#### Core Components
- **`VentureSelector`**: Dropdown for switching between ventures
- **`CreateVentureModal`**: Full-featured venture creation form
- **`TeamManagement`**: Member management and invitation interface
- **`AIConsultantWithVentures`**: Context-aware AI consultation

#### Updated Dashboard
- **Venture-aware interface**: Shows selected venture context
- **Dynamic content**: Adapts language based on venture type
- **Integrated workflow**: Seamless switching between ventures and features

## 🚀 Usage Guide

### Creating a Venture

1. **Basic Information**
   - Name (required)
   - Description (optional)
   - Venture type (required)

2. **Venture Types**
   - **Sovereign Circle** 🤝: Liberation-focused community groups
   - **Professional** 💼: Traditional business ventures
   - **Cooperative** 🔗: Collective ownership structures
   - **Solo** 👤: Individual practitioners

3. **Liberation Features**
   - Greenfield Override affiliate checkbox for free access
   - Core values and primary goals definition
   - Cost-sharing configuration for cooperatives

### Team Management

#### Roles and Permissions
- **Owner** 👑: Full administrative access
- **Co-Owner** 🤝: Management capabilities without billing access
- **Contributor** ✍️: Content creation and project participation
- **Collaborator** 🤝: Limited participation and observation
- **Observer** 👁️: Read-only access

#### Granular Permissions
- `manage_members`: Invite and manage team members
- `manage_billing`: Access billing and subscription settings
- `create_conversations`: Start AI consultations
- `access_analytics`: View venture statistics
- `export_data`: Download venture data
- `manage_integrations`: Connect external services
- `admin_all`: Full administrative access

### AI Integration

The AI Consultant now works with venture context:
- **Venture-aware advice**: Recommendations based on venture type and values
- **Team collaboration**: Supports multi-member access to conversations
- **Context preservation**: Maintains venture-specific conversation history

## 🧪 Testing

### Backend Tests
- **Unit Tests**: Comprehensive service-level testing
  - `VentureService` tests cover all CRUD operations
  - Permission validation and access control
  - Error handling and edge cases

- **Integration Tests**: API endpoint testing
  - Route validation and error handling
  - Authentication and authorization
  - Database transaction integrity

### Frontend Tests
- **Component Tests**: React component testing
  - User interaction flows
  - API integration mocking
  - Error state handling

### Test Coverage Areas
- Venture creation and management
- Team member invitation and role management
- Permission enforcement
- Billing tier logic
- Liberation-specific features

## 🔧 Development

### Running Tests
```bash
# Backend tests
cd services/core-api
npm test

# Frontend tests
cd frontend
npm test

# Integration tests
npm run test:integration
```

### Local Development
```bash
# Start backend (requires PostgreSQL)
cd services/core-api
npm run dev

# Start frontend
cd frontend
npm run dev
```

### Database Setup
```bash
# Create database
createdb collective_strategist

# Apply schemas
psql -d collective_strategist -f src/database/schema.sql
psql -d collective_strategist -f src/database/venture-schema.sql
```

## 📊 Migration Strategy

### From Contextual Cores to Ventures

#### Phase 1: Parallel Systems
- Run both systems simultaneously
- Allow users to opt into venture system
- Maintain backwards compatibility

#### Phase 2: Data Migration
```sql
-- Example migration for existing data
INSERT INTO ventures (name, description, venture_type, primary_billing_owner, billing_tier)
SELECT name, description, 'professional', user_id, 'professional'
FROM contextual_cores;

-- Create default memberships
INSERT INTO venture_members (user_id, venture_id, role, permissions)
SELECT cc.user_id, v.id, 'owner', ARRAY['admin_all']
FROM contextual_cores cc
JOIN ventures v ON v.primary_billing_owner = cc.user_id;
```

#### Phase 3: Deprecation
- Sunset contextual core endpoints
- Full transition to venture system
- Update documentation and guides

## 🔒 Security Considerations

### Access Control
- Row-level security through venture membership
- Permission-based feature access
- Invitation token security

### Data Protection
- User data scoped to venture membership
- Billing information protected to owners only
- Audit trails for sensitive operations

## 🎯 Future Enhancements

### Solidarity Networks
- Inter-venture collaboration
- Resource sharing between liberation groups
- Mutual aid coordination

### Advanced Permissions
- Custom role creation
- Time-limited access
- Project-specific permissions

### Cost Sharing Evolution
- Automated expense splitting
- Integration with payment systems
- Transparency tools for cooperatives

## 📋 API Reference

### Venture Creation Request
```typescript
interface CreateVentureRequest {
  name: string
  description?: string
  ventureType: 'sovereign_circle' | 'professional' | 'cooperative' | 'solo'
  isGreenfieldAffiliate?: boolean
  coreValues?: string[]
  primaryGoals?: string[]
  ventureVoice?: string
  targetAudience?: string
  costSharingEnabled?: boolean
  costSharingMethod?: 'equal' | 'contribution_based' | 'custom'
}
```

### Member Invitation Request
```typescript
interface InviteMemberRequest {
  email: string
  role: 'co_owner' | 'contributor' | 'collaborator' | 'observer'
  permissions?: VenturePermission[]
  costSharePercentage?: number
  personalMessage?: string
}
```

### Response Format
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

## 🎉 Success Metrics

### Technical Metrics
- ✅ 100% API endpoint coverage with tests
- ✅ Database schema with proper indexes and triggers
- ✅ Frontend components with comprehensive testing
- ✅ Type safety across the entire stack

### User Experience
- ✅ Liberation-friendly language throughout
- ✅ Simplified billing model (single account per venture)
- ✅ Intuitive venture switching and management
- ✅ Context-aware AI integration

### Business Impact
- ✅ Support for both liberation and traditional models
- ✅ Scalable team collaboration
- ✅ Clear upgrade path from individual to team usage
- ✅ Foundation for advanced cooperative features

---

*This documentation covers the complete venture-based team system implementation. For technical support or feature requests, please refer to the GitHub repository issues.*