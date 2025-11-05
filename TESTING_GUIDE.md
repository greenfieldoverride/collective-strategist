# Venture System Testing Guide

## Overview

This guide covers testing strategies and procedures for the venture-based team system, including unit tests, integration tests, and end-to-end testing scenarios.

## 🧪 Test Structure

### Backend Testing

#### Unit Tests
- **Services**: `VentureService` class methods
- **Utilities**: Helper functions and data transformations
- **Validation**: Input validation and business logic

#### Integration Tests
- **API Endpoints**: Full request/response cycle testing
- **Database**: Schema validation and constraint testing
- **Authentication**: Permission and access control

#### Test Files Location
```
services/core-api/src/__tests__/
├── services/
│   └── venture-service.test.ts
├── routes/
│   └── ventures.test.ts
└── integration/
    └── venture-api.integration.test.ts
```

### Frontend Testing

#### Component Tests
- **User Interactions**: Click, form submission, navigation
- **API Integration**: Mocked service responses
- **Error Handling**: Error states and user feedback

#### Test Files Location
```
frontend/src/components/__tests__/
├── VentureSelector.test.tsx
├── CreateVentureModal.test.tsx
├── TeamManagement.test.tsx
└── AIConsultantWithVentures.test.tsx
```

## 🚀 Running Tests

### Backend Tests

#### All Tests
```bash
cd services/core-api
npm test
```

#### Venture-Specific Tests
```bash
npm test -- --testPathPattern=venture
```

#### Watch Mode
```bash
npm run test:watch
```

#### Coverage Report
```bash
npm run test:coverage
```

### Frontend Tests

#### All Tests
```bash
cd frontend
npm test
```

#### Component Tests
```bash
npm test -- --testPathPattern=components
```

#### Watch Mode
```bash
npm test -- --watch
```

## 📋 Test Scenarios

### 1. Venture Creation

#### Happy Path
- ✅ Create sovereign circle with liberation tier
- ✅ Create professional venture with professional tier
- ✅ Create cooperative with cost sharing enabled
- ✅ Auto-assignment of billing tier based on type

#### Error Cases
- ❌ Missing required fields (name, venture type)
- ❌ Invalid venture type
- ❌ Unauthorized access
- ❌ Database connection errors

#### Test Code Example
```typescript
describe('Venture Creation', () => {
  it('should create liberation tier for sovereign circles', async () => {
    const ventureData = {
      name: 'Test Liberation Collective',
      ventureType: 'sovereign_circle',
      isGreenfieldAffiliate: true
    }
    
    const result = await ventureService.createVenture('user-id', ventureData)
    
    expect(result.billingTier).toBe('liberation')
    expect(result.maxMembers).toBe(50)
    expect(result.currentUserRole).toBe('owner')
  })
})
```

### 2. Team Management

#### Happy Path
- ✅ Invite team member with valid email and role
- ✅ Set custom permissions for invited member
- ✅ Respect member limits per billing tier
- ✅ Generate secure invitation tokens

#### Error Cases
- ❌ Invite to non-existent venture
- ❌ Insufficient permissions to invite
- ❌ Member limit exceeded
- ❌ Invalid email format

#### Test Code Example
```typescript
describe('Team Invitations', () => {
  it('should create invitation with correct permissions', async () => {
    const inviteData = {
      email: 'member@example.com',
      role: 'contributor',
      permissions: ['create_conversations']
    }
    
    const invitation = await ventureService.inviteMember(userId, ventureId, inviteData)
    
    expect(invitation.invitedEmail).toBe('member@example.com')
    expect(invitation.status).toBe('pending')
    expect(invitation.invitationToken).toBeTruthy()
  })
})
```

### 3. Permission System

#### Access Control Tests
- ✅ Owner can perform all operations
- ✅ Co-owner can manage members but not billing
- ✅ Contributors can create conversations
- ✅ Observers have read-only access

#### Permission Validation
- ❌ Non-members cannot access venture
- ❌ Insufficient permissions blocked
- ❌ Archived ventures restrict access

### 4. Frontend Component Testing

#### VentureSelector Component
```typescript
describe('VentureSelector', () => {
  it('should display ventures after loading', async () => {
    mockVentureApi.getVentures.mockResolvedValue({
      ventures: mockVentures,
      total: 2,
      hasMore: false
    })
    
    render(<VentureSelector {...props} />)
    
    await waitFor(() => {
      expect(screen.getByText('Liberation Collective')).toBeInTheDocument()
    })
  })
})
```

#### CreateVentureModal Component
```typescript
describe('CreateVentureModal', () => {
  it('should create venture with form data', async () => {
    render(<CreateVentureModal isOpen={true} {...props} />)
    
    await user.type(screen.getByLabelText('Venture Name *'), 'Test Venture')
    await user.click(screen.getByText('Create Venture'))
    
    expect(mockVentureApi.createVenture).toHaveBeenCalledWith({
      name: 'Test Venture',
      ventureType: 'professional'
    })
  })
})
```

## 🔍 Test Data Setup

### Mock Ventures
```typescript
const mockVentures: Venture[] = [
  {
    id: 'venture-1',
    name: 'Liberation Collective',
    ventureType: 'sovereign_circle',
    billingTier: 'liberation',
    maxMembers: 50,
    currentUserRole: 'owner',
    currentUserPermissions: ['admin_all']
  },
  {
    id: 'venture-2',
    name: 'Professional Consulting',
    ventureType: 'professional',
    billingTier: 'professional',
    maxMembers: 5,
    currentUserRole: 'contributor'
  }
]
```

### Database Test Setup
```sql
-- Test database setup
CREATE DATABASE collective_strategist_test;

-- Apply schemas
\i src/database/schema.sql
\i src/database/venture-schema.sql

-- Insert test data
INSERT INTO ventures (id, name, venture_type, primary_billing_owner, billing_tier)
VALUES ('test-venture-id', 'Test Venture', 'professional', 'test-user-id', 'professional');
```

## 🎯 Test Coverage Goals

### Backend Coverage Targets
- **Services**: 90%+ line coverage
- **Routes**: 85%+ line coverage
- **Critical paths**: 100% coverage

### Frontend Coverage Targets
- **Components**: 80%+ line coverage
- **User interactions**: 90%+ coverage
- **Error scenarios**: 85%+ coverage

### Key Test Metrics
```bash
# Backend coverage report
npm run test:coverage

# Frontend coverage report  
npm test -- --coverage

# Integration test results
npm run test:integration
```

## 🚨 Critical Test Cases

### Security Tests
1. **Authentication**: Verify JWT token validation
2. **Authorization**: Test role-based access control
3. **Input Validation**: Prevent SQL injection and XSS
4. **Data Isolation**: Users only see their ventures

### Business Logic Tests
1. **Billing Tier Logic**: Automatic tier assignment
2. **Member Limits**: Respect tier-based limits
3. **Permission Inheritance**: Role-based permissions
4. **Liberation Features**: Greenfield affiliate detection

### Error Handling Tests
1. **Database Errors**: Connection failures, constraint violations
2. **API Errors**: Network failures, invalid responses
3. **User Errors**: Invalid input, unauthorized access
4. **Recovery**: Graceful degradation and error messages

## 🔧 Test Configuration

### Jest Configuration (Backend)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**'
  ]
}
```

### React Testing Library (Frontend)
```javascript
// setup.ts
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

configure({ testIdAttribute: 'data-testid' })
```

## 📊 Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Run frontend tests
        run: |
          cd frontend
          npm ci
          npm test
```

## 🐛 Debugging Tests

### Common Issues

#### Database Connection
```bash
# Check PostgreSQL status
brew services list | grep postgres

# Create test database
createdb collective_strategist_test
```

#### Mock Issues
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})
```

#### Async Testing
```typescript
// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Expected text')).toBeInTheDocument()
})
```

### Debugging Commands
```bash
# Run specific test file
npm test -- venture-service.test.ts

# Run tests with debug output
npm test -- --verbose

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest venture-service.test.ts
```

## 📈 Performance Testing

### Load Testing
- **Concurrent venture creation**: 100 requests/second
- **Member invitation volume**: 1000 invitations/hour
- **API response times**: <200ms for 95th percentile

### Stress Testing
- **Database connections**: Test connection pool limits
- **Memory usage**: Monitor for memory leaks
- **CPU usage**: Profile intensive operations

---

*This testing guide provides comprehensive coverage for the venture system. Regular test execution ensures system reliability and facilitates safe refactoring.*