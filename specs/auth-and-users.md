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

- `/auth/login` - Login form (email + password)
- `/auth/signup` - Signup form (email + password, min 10 chars)

**Better Auth API** (handled automatically):

- `/auth/sign-in/email` - Login endpoint
- `/auth/sign-up/email` - Signup endpoint
- `/auth/sign-out` - Logout endpoint

**Protected Routes** (redirect to `/auth/login` if not authenticated):

- `/` - Dashboard (shows active, finished, archived tournaments)
- `/tournament/create` - Create tournament
- `/tournament/[id]/*` - Tournament management

**Public Routes**:

- `/court/[token]` - Score entry (no login needed)

## Flow

1. User visits `/auth/signup`
2. Enters email and password (min 10 characters)
3. Submits form → POST to `/auth/sign-up/email`
4. On success, redirects to `/` (dashboard)
5. Dashboard shows: Active tournaments, Finished tournaments, Archived (max 5)

Same flow for login at `/auth/login`.

## Implementation

- Better Auth handles sessions automatically
- Password minimum: 10 characters
- No name field required
- After auth, always redirect to `/`
- Protected routes check `event.locals.user`
