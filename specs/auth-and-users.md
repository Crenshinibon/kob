# Authentication

## Overview

Simple auth system using Better Auth. Email and password only (no name field). Players accessing courts don't need accounts.

## User Types

### Admin (Authenticated)

- Creates and manages tournaments
- Access: Login required
- Pages: Dashboard, create tournament, manage tournament

### Player (Anonymous)

- Enters scores via court URL
- No login needed
- Pages: Court score entry (public access via token)

## Routes

**Auth Pages**:

- `/login` - Login form (email + password)
- `/signup` - Signup form (email + password, min 10 chars)

Note: Auth pages are at root level, not under `/auth/` namespace, to avoid conflicts with Better Auth API routes.

**Better Auth API** (handled automatically):

- `/auth/sign-in/email` - Login endpoint
- `/auth/sign-up/email` - Signup endpoint
- `/auth/sign-out` - Logout endpoint

**Protected Routes** (redirect to `/login` if not authenticated):

- `/` - Dashboard (shows active, draft, finished, archived tournaments)
- `/tournament/create` - Create tournament
- `/tournament/[id]/*` - Tournament management

**Public Routes**:

- `/court/[token]` - Score entry (no login needed)

## Flow

1. User visits `/signup`
2. Enters email and password (min 10 characters)
3. Submits form → POST to `/auth/sign-up/email`
4. On success, redirects to `/` (dashboard)
5. Dashboard shows: Active tournaments, Draft tournaments, Finished tournaments, Archived (max 5)

Same flow for login at `/login`.

## Implementation

- Better Auth handles sessions automatically
- Password minimum: 10 characters
- No name field required
- After auth, always redirect to `/`
- Protected routes check `event.locals.user`
