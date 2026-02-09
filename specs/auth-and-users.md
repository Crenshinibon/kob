# Authentication & User Management

## Overview

This specification defines the authentication system and user management for the KoB Tracker. The system supports two user types with distinct permission levels and access patterns.

## User Roles

### 1. Authenticated User ("Org")

**Purpose**: Tournament administrators who create and manage tournaments.

**Permissions**:
- Full CRUD operations on tournaments
- Generate and share court links/QR codes
- Manually override scores when necessary
- Control tournament flow: Start → Close Rounds → Finalize
- Access to all tournament data and analytics

**Authentication Method**: Email/password via Better Auth

**User Flow**:
1. Sign up with email and password
2. Verify email (optional for MVP)
3. Log in to access dashboard
4. Create and manage tournaments
5. Log out when finished

### 2. Anonymous User ("Player")

**Purpose**: Participants who enter scores and view standings for specific courts.

**Permissions**:
- Read-only access to court standings and match data
- Write access to enter scores (only while round is active)
- Cannot modify closed rounds or other courts

**Access Method**: Unique court URLs with embedded tokens

**User Flow**:
1. Receive QR code/URL from Org (displayed at physical court)
2. Scan/access URL on mobile device
3. View current court standings and enter scores
4. Cannot access after round is closed by Org

## Technical Implementation

### Better Auth Configuration

Located in: `src/lib/server/auth.ts`

**Current Setup**:
```typescript
- Provider: Drizzle Adapter with PostgreSQL
- Methods: Email/password enabled
- Session: Cookie-based with sveltekitCookies plugin
- Base URL: From env.ORIGIN
```

**Required Environment Variables**:
- `BETTER_AUTH_SECRET`: Secret key for token signing
- `ORIGIN`: Application base URL
- `DATABASE_URL`: PostgreSQL connection string

### Session Management

Located in: `src/hooks.server.ts`

**Implementation**:
- Middleware extracts session from request headers
- Attaches `user` and `session` to `event.locals`
- Uses `svelteKitHandler` for Better Auth route handling
- Guards routes based on authentication status

**Type Safety**:
```typescript
// src/app.d.ts
interface Locals {
  user?: User;
  session?: Session;
}
```

### Protected Routes

**Org-Only Routes** (require authentication):
- `/` - Dashboard (tournament list)
- `/tournament/create` - Create new tournament
- `/tournament/[id]/manage` - Tournament management
- `/tournament/[id]/players` - Player management
- `/tournament/[id]/courts` - Court management & QR codes

**Public Routes** (no auth required):
- `/court/[token]` - Court score entry (write access while active)
- `/login`, `/signup` - Authentication pages
- `/tournament/[id]/public` - Public tournament view (read-only)

### Security Considerations

1. **Court Token Security**:
   - Tokens should be cryptographically random (32+ characters)
   - Tokens embedded in URL path or query parameter
   - Tokens map to specific court + round + tournament
   - Tokens expire when round is closed

2. **CSRF Protection**:
   - Better Auth handles CSRF tokens automatically
   - All state-changing operations use POST requests

3. **Rate Limiting** (Future Enhancement):
   - Limit score submissions per IP
   - Prevent brute force on court tokens

## Database Schema

**User Table** (managed by Better Auth):
- `id`: UUID primary key
- `email`: Unique email address
- `emailVerified`: Boolean
- `name`: Display name
- `createdAt`, `updatedAt`: Timestamps
- Plus Better Auth managed fields

**Session Table** (managed by Better Auth):
- Standard Better Auth session fields

## UI/UX Guidelines

### Org Interface

**Login Page** (`/login`):
- Email input field
- Password input field
- Submit button
- Link to signup page
- Error message display

**Signup Page** (`/signup`):
- Email input with validation
- Password with strength indicator
- Confirm password field
- Submit button
- Link to login page

**Navigation** (when authenticated):
- User menu with name/display
- Logout option
- Dashboard link

### Player Interface

**Court Access**:
- No login required
- Direct access via URL
- Mobile-optimized interface
- Clear indication of court number and tournament

## API Endpoints

Better Auth automatically provides:
- `/api/auth/sign-in` - Login
- `/api/auth/sign-up` - Registration
- `/api/auth/sign-out` - Logout
- `/api/auth/session` - Get current session

Custom endpoints needed:
- None for MVP (Better Auth covers all auth needs)

## Error Handling

**Authentication Errors**:
- Invalid credentials: "Invalid email or password"
- Unauthenticated access to protected route: Redirect to login
- Session expired: Redirect to login with return URL

**Authorization Errors**:
- Org accessing wrong tournament: 403 Forbidden
- Player with invalid token: "Invalid or expired court link"
- Player trying to edit closed round: "This round is closed"

## Testing Strategy

**E2E Tests**:
1. User registration flow
2. User login/logout flow
3. Protected route access control
4. Court token access (valid and invalid)
5. Session persistence across page reloads

## Future Enhancements

1. **Email Verification**: Require email verification before creating tournaments
2. **Password Reset**: Self-service password reset via email
3. **Social Login**: Google/GitHub OAuth for easier onboarding
4. **User Profiles**: Avatars, preferences, tournament history
5. **Multi-Org Support**: Allow users to be orgs on multiple tournaments
6. **Role-Based Access**: Assistant orgs with limited permissions
