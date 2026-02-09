# Court Operations

## Overview

This specification defines the court-level operations for both the Org interface and the anonymous Player interface. It covers entering scores, viewing standings, and the real-time collaboration model where multiple players can access the same court.

## User Stories

### As an Org, I want to...

1. **View court status** at a glance from the management dashboard
2. **Generate QR codes** for each court that players can scan
3. **Monitor score entry progress** across all courts in real-time
4. **Override scores** if there's a dispute or error
5. **Close a round** once all courts have complete scores

### As a Player, I want to...

1. **Access my court** quickly via QR code or URL
2. **See current standings** before entering scores
3. **Enter scores** for completed matches with validation
4. **See which matches are still pending**
5. **Know the court is locked** when the round closes

## Access Control Model

### Court Access Tokens

**Token Format**: Cryptographically random string (32 characters)
**Example**: `kob_court_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p`

**Token Lifecycle**:
```
Round Created → Token Generated → Token Active → Round Closed → Token Expired
                                    │
                                    ▼
                              Players can access
                              and enter scores
```

**Token URL Pattern**:
```
/court/[token]
Example: /court/kob_court_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p
```

**Token Validation**:
1. Token exists in database
2. Token is marked as `is_active = true`
3. Associated round is in "active" status
4. Tournament is in "active" status

If any check fails: Display "Court link expired or invalid"

## Page Routes & Components

### 1. Org Court View (`/tournament/[id]/court/[number]`)

**Purpose**: Detailed view of a specific court for monitoring and management.

**Layout**:
```
┌─────────────────────────────────────┐
│  ← Back to Tournament   Court 1     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │        [QR CODE]            │   │
│  │                             │   │
│  │    Scan to enter scores     │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Copy Court URL]  [Reset Token]   │
│                                     │
│  Players on this court:             │
│  ┌─────────────────────────────┐   │
│  │ • Alice (A)                 │   │
│  │ • Bob (B)                   │   │
│  │ • Carol (C)                 │   │
│  │ • David (D)                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  Matches:                           │
│  ┌─────────────────────────────┐   │
│  │ Match 1: A & B vs C & D     │   │
│  │ Score: [21] - [19] ✓ Saved  │   │
│  │ [Edit] [Override]           │   │
│  ├─────────────────────────────┤   │
│  │ Match 2: A & C vs B & D     │   │
│  │ Score: [--] - [--] ○ Pending│   │
│  ├─────────────────────────────┤   │
│  │ Match 3: A & D vs B & C     │   │
│  │ Score: [--] - [--] ○ Pending│   │
│  └─────────────────────────────┘   │
│                                     │
│  Current Standings:                 │
│  1. Alice     21 pts  +2   (1 match)│
│  2. Bob       21 pts  +2   (1 match)│
│  3. Carol     19 pts  -2   (1 match)│
│  4. David     19 pts  -2   (1 match)│
│                                     │
└─────────────────────────────────────┘
```

**Features**:
- Large QR code for players to scan
- Copy court URL to clipboard
- Reset token (generates new token, invalidates old)
- List of 4 players on this court
- All 3 matches with scores or pending status
- Override capability for Org
- Live standings preview

### 2. Player Court Interface (`/court/[token]`)

**Purpose**: Mobile-optimized interface for players to enter scores.

**Header Section**:
```
┌─────────────────────────────────────┐
│  Beach Bash 2024        Round 2/3   │
│  Court 1                3:45 PM     │
├─────────────────────────────────────┤
```

**Players Section**:
```
│  Players:                           │
│  ┌────┬────┬────┬────┐             │
│  │ A  │ B  │ C  │ D  │             │
│  ├────┼────┼────┼────┤             │
│  │Alice│Bob│Carol│David│            │
│  └────┴────┴────┴────┘             │
```

**Matches Section**:
```
│                                     │
│  Match 1: A & B vs C & D            │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │    Alice & Bob     21       │   │
│  │       vs                    │   │
│  │    Carol & David   19       │   │
│  │                    [Edit]   │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Match 2: A & C vs B & D            │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │  [Score A&C]  -  [Score B&D]│   │
│  │                             │   │
│  │     [Save Scores]           │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Match 3: A & D vs B & C            │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │  [Score A&D]  -  [Score B&C]│   │
│  │                             │   │
│  │     [Save Scores]           │   │
│  │                             │   │
│  └─────────────────────────────┘   │
```

**Standings Section**:
```
│                                     │
│  Live Standings:                    │
│  ┌─────────────────────────────┐   │
│  │ #  Player    Pts   Diff     │   │
│  │ 1  Alice     42    +4       │   │
│  │ 2  Bob       41    +2       │   │
│  │ 3  Carol     38    -2       │   │
│  │ 4  David     37    -4       │   │
│  └─────────────────────────────┘   │
│                                     │
│  Last updated: 2 minutes ago        │
│  Updates automatically              │
│                                     │
└─────────────────────────────────────┘
```

**Closed Round State**:
```
┌─────────────────────────────────────┐
│  ⚠️ This round is closed            │
│                                     │
│  Scores have been finalized and     │
│  players have moved to new courts.  │
│                                     │
│  Check with the organizer for your  │
│  next court assignment.             │
│                                     │
│  [View Final Standings]             │
│                                     │
└─────────────────────────────────────┘
```

**Score Entry Flow**:

1. **Initial State**: Both score inputs empty
2. **Validation**: 
   - Scores must be positive integers
   - Typical volleyball: 21+ points to win
   - Must win by 2 points
   - Maximum score: 50 (to prevent errors)
3. **Submit**: Click "Save Scores"
4. **Confirmation**: Show success toast
5. **Update**: Standings recalculate automatically
6. **Conflict**: If another player already entered different scores, show both and allow override with warning

## Match Structure

### Partner Rotation

For 4 players (A, B, C, D), the 3 matches ensure everyone partners with everyone:

**Match 1**: A & B vs C & D
**Match 2**: A & C vs B & D
**Match 3**: A & D vs B & C

### Score Entry Rules

**Validation**:
- Both scores required
- Scores must be different (no ties in volleyball)
- Winner must have 21+ points
- Winner must win by at least 2 points
- Maximum score: 50 (prevents typo like 210)

**Examples**:
- ✅ 21-19 (valid)
- ✅ 25-23 (valid - extended rally)
- ✅ 30-28 (valid - long rally)
- ❌ 21-21 (invalid - tie)
- ❌ 20-18 (invalid - no winner to 21)
- ❌ 21-20 (invalid - didn't win by 2)
- ❌ 210-19 (invalid - probable typo)

## Server Actions

### Enter Match Scores

**Action**: `enterMatchScores`

**Input**:
```typescript
{
  courtAccessToken: string;
  matchId: number;
  teamAScore: number;
  teamBScore: number;
}
```

**Authorization**:
1. Validate court access token is active
2. Verify match belongs to token's court rotation
3. Verify round is active

**Validation**:
1. Both scores are positive integers
2. Scores are different
3. Winner has 21+ points
4. Winner wins by 2+ points
5. Both scores <= 50

**Process**:
1. Update match record with scores
2. Set `is_complete = true`
3. Set `entered_at` timestamp
4. Set `entered_by` = token or 'org'
5. Recalculate court standings
6. Broadcast update to connected clients (SSE/WebSocket)
7. Return updated standings

**Conflict Resolution**:
If scores already exist and differ:
```typescript
{
  error: 'SCORE_CONFLICT',
  existingScores: { teamA: 21, teamB: 19 },
  newScores: { teamA: 20, teamB: 22 },
  message: 'Different scores were already entered for this match'
}
```

Org can override with additional flag: `forceUpdate: true`

### Override Scores (Org Only)

**Action**: `overrideMatchScores`

**Authorization**: Must be tournament org

**Process**: Same as enter scores but with org privileges, allows updating completed matches.

### Reset Court Token (Org Only)

**Action**: `resetCourtToken`

**Process**:
1. Generate new cryptographically random token
2. Mark old token as inactive
3. Create new court access record
4. Return new token and QR code URL

## Real-Time Updates

**Challenge**: Multiple players may be viewing/entering scores simultaneously.

**Solution**: Server-Sent Events (SSE) for live updates

**Implementation**:
```typescript
// Client subscribes to court updates
const eventSource = new EventSource(`/api/court/${token}/events`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'SCORE_UPDATE') {
    updateStandings(data.standings);
  }
  if (data.type === 'ROUND_CLOSED') {
    showRoundClosedMessage();
  }
};
```

**Events**:
- `SCORE_UPDATE`: New scores entered, includes updated standings
- `ROUND_CLOSED`: Round closed by org, court is now read-only
- `TOKEN_RESET`: Token was reset, current session invalid

## QR Code Generation

**Library**: `qrcode` (npm package)

**Specifications**:
- Size: 300x300px (display), 600x600px (print)
- Error correction: Medium (15%)
- Format: PNG
- URL encoded: Full court URL

**Generation**:
```typescript
import QRCode from 'qrcode';

const url = `${origin}/court/${token}`;
const qrCodeDataUrl = await QRCode.toDataURL(url, {
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
});
```

**Display**:
- Centered on page
- Court number label below
- Instructions: "Scan to enter scores"
- Click to enlarge modal

**Print Layout**:
```
┌─────────────────────────────────────┐
│                                     │
│         [QR CODE - 400px]           │
│                                     │
│           COURT 1                   │
│                                     │
│    Scan with your phone camera      │
│       to enter match scores         │
│                                     │
└─────────────────────────────────────┘
```

Print 4 per page for all courts.

## Standings Calculation

**Data Structure**:
```typescript
interface PlayerStanding {
  playerId: number;
  name: string;
  totalPoints: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  matchesPlayed: number;
  rank: number;
}
```

**Calculation**:
```typescript
// For each player on the court
const standing = {
  totalPoints: sum(points from all matches played),
  pointsFor: sum(all scores when player was playing),
  pointsAgainst: sum(opponent scores when player was playing),
  pointDifferential: pointsFor - pointsAgainst,
  matchesPlayed: count of completed matches player participated in
};
```

**Tiebreakers** (in order):
1. Total Points Won (highest)
2. Point Differential (highest)
3. Head-to-Head (if applicable)
4. Manual decision (Org decides)
5. Random (system coin flip)

**Ranking Display**:
- Show rank number (1-4)
- Highlight top 2 (promotion) and bottom 2 (relegation)
- Use colors: Gold (1st), Silver (2nd), Bronze (3rd), neutral (4th)

## Edge Cases

1. **Simultaneous Score Entry**: Last write wins, show conflict warning
2. **Player refreshes page**: Re-fetch current state, preserve any unsaved input with confirmation
3. **Token shared with wrong person**: Org can reset token, invalidates old URL
4. **Phone dies mid-entry**: Scores auto-save to localStorage, restore on return
5. **Disputed scores**: Org override capability with audit trail
6. **Network failure**: Queue submission, retry with exponential backoff

## Mobile Optimization

**Design Principles**:
- Large touch targets (min 48px)
- High contrast for outdoor/sunlight visibility
- Simple, uncluttered layout
- Large score input fields
- Clear visual feedback on actions

**Input Optimization**:
- Number pad for score entry
- Auto-advance to next field
- Double-tap to edit saved scores
- Swipe between matches

**Performance**:
- Lightweight page (< 100KB)
- Fast load time (< 2s on 3G)
- Minimal JavaScript
- CSS-only animations

## Testing Strategy

**E2E Tests**:
1. Access court via QR code/URL
2. Enter valid scores for all matches
3. View real-time standings updates
4. Attempt invalid score entries (validation)
5. Simultaneous access from multiple devices
6. Token expiration when round closes
7. Org override functionality
8. Reset token flow

**Manual Testing Checklist**:
- [ ] QR code scans correctly on iOS
- [ ] QR code scans correctly on Android
- [ ] Page readable in direct sunlight
- [ ] All touch targets easy to tap
- [ ] Scores save correctly
- [ ] Standings calculate correctly
- [ ] Page works offline (service worker)
