# Authentication

## Overview

Simple auth system using Better Auth. Email and password only (no name field). Players accessing courts don't need accounts.

## User Types

### Admin (Authenticated)

- Creates and manages tournaments
- Access: Login required
- Pages: Dashboard, create tournament, manage tournament

### Player (Anonymous)

- Enters scores via personal player URL (proposed, [098](./098_player-page.md)); check-in QR is that URL ([097](./097_player-check-in.md))
- No login needed
- Pages: Player page (public access via token). Court score entry (`/court/[token]`) remains as organizer fallback.

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

- `/` - Dashboard (shows setup, active, finished, archived tournaments — setup: [099](./099_tournament-setup-and-start.md))
- `/tournament/create` - Create tournament
- `/tournament/[id]/*` - Tournament management

**Public Routes**:

- `/player/[token]` - Personal player page: current game + score entry (proposed, [098](./098_player-page.md))
- `/court/[token]` - Court score entry, organizer fallback after 098 (no login needed)

## Flow

1. User visits `/signup`
2. Enters email and password (min 10 characters)
3. Submits form → POST to `/auth/sign-up/email`
4. On success, redirects to `/` (dashboard)
5. Dashboard shows: Setup tournaments, Active tournaments, Finished tournaments, Archived (max 5)

Same flow for login at `/login`.

## Implementation

- Better Auth handles sessions automatically via `svelteKitHandler` in `hooks.server.ts`
- Password minimum: 10 characters
- No name field required
- After auth, always redirect to `/`
- Protected routes check `event.locals.user` (optional typed)
- Auth pages at root level (`/login`, `/signup`) to avoid conflicts with Better Auth API routes (`/auth/*`)
