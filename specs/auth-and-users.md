# Authentication (Simplified)

## Overview

Simple auth system using Better Auth. Just need to protect tournament creation/management. Players accessing courts don't need accounts.

## User Types

### Admin (Authenticated)

- Creates and manages tournaments
- Access: Login required
- Pages: Dashboard, create tournament, manage tournament

### Player (Anonymous)

- Enters scores via court URL
- No login needed
- Pages: Court score entry (public access via token)

## Implementation

**Better Auth Setup** (already in place):

- Email/password authentication
- Session-based cookies
- Protected routes via `event.locals.user`

**Protected Routes**:

```
/                    - Protected (tournament list)
/tournament/create   - Protected
/tournament/[id]/*   - Protected (admin only)
/court/[token]       - Public (anyone with link)
/login, /signup      - Public
```

**No complex roles, permissions, or audit trails needed.**
