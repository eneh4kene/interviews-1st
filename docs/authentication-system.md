# Authentication System Documentation

## Overview

The Interview Me platform implements a comprehensive authentication system that supports multiple user roles (Workers, Clients, Admins) with different access patterns and security requirements. The system follows security best practices including JWT tokens, HTTP-only cookies, and role-based access control.

## Architecture

### User Roles

1. **WORKER** - Career coaches and recruiters managing client portfolios
2. **MANAGER** - Senior workers with additional management capabilities
3. **ADMIN** - System administrators with full platform access
4. **CLIENT** - Job seekers using the platform

### Authentication Patterns

#### 1. Traditional Login (Workers, Managers, Admins, Clients)
- Username/password authentication
- JWT access tokens (15 minutes)
- HTTP-only refresh tokens (30 days)
- Role-based redirects after login

#### 2. Magic Link Authentication (Clients)
- Passwordless authentication for interview offers
- Time-limited, single-use tokens
- Direct access to offer acceptance/decline pages

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/login`
Authenticates users with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user1",
      "email": "user@example.com",
      "name": "User Name",
      "role": "WORKER",
      "isActive": true,
      "twoFactorEnabled": false,
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

#### POST `/api/auth/logout`
Logs out the current user and clears refresh token cookie.

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Logout successful"
}
```

#### POST `/api/auth/refresh`
Refreshes the access token using the refresh token.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
  },
  "message": "Token refreshed successfully"
}
```

#### POST `/api/auth/magic-link`
Generates a magic link token for client interview offers.

**Request:**
```json
{
  "email": "client@example.com",
  "interviewId": "interview_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "magic_link_token",
    "expiresAt": "2024-01-17T10:30:00Z"
  },
  "message": "Magic link generated successfully"
}
```

#### GET `/api/auth/me`
Returns the current user's profile information.

**Headers:**
```
Authorization: Bearer access_token_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user1",
    "email": "user@example.com",
    "name": "User Name",
    "role": "WORKER",
    "isActive": true,
    "twoFactorEnabled": false,
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T00:00:00Z"
  },
  "message": "User profile retrieved successfully"
}
```

## Frontend Implementation

### Login Pages

#### Main Login Page (`/login`)
- Role selection interface
- Cards for Workers, Clients, and Admins
- Links to specific login forms

#### Worker Login (`/login/worker`)
- Email/password form
- Redirects to `/dashboard` on success
- Demo credentials displayed

#### Client Login (`/login/client`)
- Email/password form
- Redirects to `/client` on success
- Demo credentials displayed

#### Admin Login (`/login/admin`)
- Email/password form
- Redirects to `/admin` on success
- Demo credentials displayed

### Magic Link Offer Page (`/offer/[token]`)
- Displays interview offer details
- Accept/Decline buttons
- Payment integration for acceptance
- Token validation and expiry handling

## Security Features

### Token Management
- **Access Tokens**: 15-minute expiry, stored in localStorage
- **Refresh Tokens**: 30-day expiry, HTTP-only cookies
- **Magic Link Tokens**: 48-hour expiry, single-use

### Password Security
- Bcrypt hashing for password storage
- Generic error messages to prevent user enumeration
- Rate limiting on authentication endpoints

### Cookie Security
- HTTP-only cookies for refresh tokens
- Secure flag in production
- SameSite=Lax for CSRF protection

### Role-Based Access Control
- JWT payload includes user role
- Frontend redirects based on role
- Backend middleware for route protection

## Demo Credentials

### Workers
- **Email**: `sarah.worker@interview-me.com`
- **Password**: `password`
- **Role**: WORKER

- **Email**: `mike.worker@interview-me.com`
- **Password**: `password`
- **Role**: WORKER

### Managers
- **Email**: `jane.manager@interview-me.com`
- **Password**: `password`
- **Role**: MANAGER

### Admins
- **Email**: `admin@interview-me.com`
- **Password**: `password`
- **Role**: ADMIN

### Clients
- **Email**: `sarah.johnson@email.com`
- **Password**: `password`
- **Role**: CLIENT

## Business Logic Integration

### Client Payment Flow
1. Worker schedules interview
2. System generates magic link
3. Client receives email with offer link
4. Client clicks link and sees offer details
5. Client accepts → Stripe payment flow
6. Client declines → No charge, offer closed

### No Outreach Policy
- Clients don't receive general notifications
- Only interview offer emails with magic links
- Workers can manage clients without client login required

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Security
NODE_ENV=development
```

## Future Enhancements

### Planned Features
1. **Two-Factor Authentication (2FA)**
   - TOTP support for workers and admins
   - WebAuthn for enhanced security

2. **SSO Integration**
   - Google OAuth for workers
   - Microsoft OAuth for enterprise clients

3. **Session Management**
   - Device tracking
   - "Sign out all devices" functionality
   - Session timeout warnings

4. **Advanced Security**
   - IP-based access controls
   - Suspicious activity detection
   - Audit logging for all authentication events

### Security Improvements
1. **Token Rotation**
   - Automatic refresh token rotation
   - Token blacklisting for compromised sessions

2. **Rate Limiting**
   - Per-endpoint rate limits
   - IP-based blocking for abuse

3. **Monitoring**
   - Failed login attempt tracking
   - Geographic access monitoring
   - Anomaly detection

## Testing

### API Testing
```bash
# Test worker login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.worker@interview-me.com","password":"password"}'

# Test admin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@interview-me.com","password":"password"}'

# Test user profile
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3001/api/auth/me
```

### Frontend Testing
1. Visit `http://localhost:3000/login`
2. Choose role and click "Sign in"
3. Use demo credentials
4. Verify redirect to appropriate dashboard

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure API is running on correct port
   - Check CORS configuration in API

2. **Token Expiry**
   - Access tokens expire after 15 minutes
   - Refresh tokens expire after 30 days
   - Magic links expire after 48 hours

3. **Cookie Issues**
   - Ensure `credentials: 'include'` in fetch requests
   - Check cookie domain and path settings

4. **Role-Based Redirects**
   - Verify user role in JWT payload
   - Check frontend redirect logic

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` and checking browser console and API logs for detailed error messages. 