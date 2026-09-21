# Authentication

## Overview

Simple auth system using Better Auth. Email and password only (no name field). Players accessing courts don't need accounts.

## User Types

### Admin (Authenticated)

- Creates and manages tournaments
- Access: Login required
- Pages: Dashboard, create tournament, manage tournament

### Player (Anonymous)

- Enters scores via court URL and/or personal player URL ([098](./098_player-page.md)); check-in QR is optional ([097](./097_player-check-in.md))
- No login needed
- Pages: Court score entry (public access via court token). Player page (public access via player token).

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

- `/tournament/create` - Create tournament
- `/tournament/[id]/*` - Tournament management (except public court/player URLs)

**Public Routes**:

- `/` - Guest **landing page** (format + features + sign-up / log-in). Authenticated users see the organizer dashboard (setup, active, finished, archived — setup: [099](./099_tournament-setup-and-start.md)).
- `/login` - Login form (email + password)
- `/signup` - Signup form (email + password, min 10 chars)
- `/docs`, `/faq`, `/privacy` - Public documentation
- `/court/[token]` - Court score entry (no login needed)
- `/player/[token]` - Personal player page: current game + score entry ([098](./098_player-page.md))

## Flow

Guests visiting `/` see the public landing page (format, features, create-account / log-in). Organizers sign up or log in from there.

1. User visits `/signup` (or `/login`)
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
