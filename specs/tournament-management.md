# Tournament Management

## Overview

This specification defines the complete tournament lifecycle management system. It covers creating tournaments, managing players, starting tournaments, and the overall flow from creation to completion.

## User Stories

### As an Org, I want to...

1. **Create a tournament** with a name and settings
2. **Add exactly 16 players** via text input or paste
3. **Choose seeding mode** (random or manual) for the first round
4. **Start the tournament** to lock player list and generate court links
5. **View all my tournaments** in a dashboard
6. **Manage an active tournament** through rounds to completion
7. **Archive completed tournaments** for historical reference

## Tournament States

```
┌─────────┐    Start     ┌──────────┐   Close Round   ┌──────────┐
│  DRAFT  │─────────────►│  ACTIVE  │◄───────────────►│  ACTIVE  │
└─────────┘              └──────────┘   (Next Round)  └──────────┘
                               │                            │
                               │                            │
                               │ Final Round                │
                               ▼                            │
                         ┌──────────┐                       │
                         │COMPLETED │                       │
                         └──────────┘                       │
                               │                            │
                               │ Archive                    │
                               ▼                            │
                         ┌──────────┐                       │
                         │ARCHIVED  │◄──────────────────────┘
                         └──────────┘
```

### State Definitions

**DRAFT**:
- Player list can be modified
- Settings can be changed
- Court assignments not yet generated
- Org can delete tournament

**ACTIVE**:
- Player list is locked
- Current round is in progress
- Court access tokens are active
- Org can close current round to advance

**COMPLETED**:
- All rounds finished
- Final standings calculated
- No more modifications allowed
- Can be archived

**ARCHIVED**:
- Read-only historical record
- Visible in tournament history
- Can be viewed but not modified

## Page Routes & Components

### 1. Dashboard (`/`)

**Purpose**: Tournament listing and quick actions.

**Layout**:
```
┌─────────────────────────────────────┐
│  KoB Tracker    [+ New Tournament]  │
├─────────────────────────────────────┤
│                                     │
│  Active Tournaments                 │
│  ┌───────────────────────────────┐ │
│  │ Beach Bash 2024     [Manage]  │ │
│  │ Round 2 of 3, 2 courts ready  │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │ Winter Classic      [Manage]  │ │
│  │ Round 1 of 5, all courts ready│ │
│  └───────────────────────────────┘ │
│                                     │
│  Recent Tournaments                 │
│  ┌───────────────────────────────┐ │
│  │ Summer League [View Results]  │ │
│  │ Completed - 16 players        │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Functionality**:
- List active tournaments (limit 5)
- List recent completed/archived tournaments (limit 5)
- Quick action buttons
- Empty state for new users

### 2. Create Tournament (`/tournament/create`)

**Purpose**: Multi-step wizard for tournament setup.

**Step 1: Tournament Settings**:
```
┌─────────────────────────────────────┐
│  Create Tournament        [Cancel]  │
├─────────────────────────────────────┤
│                                     │
│  Tournament Name *                  │
│  [Beach Volleyball Championship   ] │
│                                     │
│  Number of Courts                   │
│  [4 ▼] (Fixed at 4 for MVP)         │
│                                     │
│  Number of Rounds *                 │
│  [3 ▼] (1-10)                       │
│                                     │
│  First Round Seeding *              │
│  ( ) Random - System assigns courts │
│  ( ) Manual - You assign players    │
│                                     │
│            [Next: Add Players →]    │
│                                     │
└─────────────────────────────────────┘
```

**Fields**:
- **Name**: Required, max 100 chars
- **Number of Courts**: Fixed at 4 (display only)
- **Number of Rounds**: Required, 1-10, default 3
- **Seeding Mode**: Required, 'random' or 'manual'

**Step 2: Add Players**:
```
┌─────────────────────────────────────┐
│  Add Players              [← Back]  │
├─────────────────────────────────────┤
│                                     │
│  Players (16 required)              │
│  Currently: 14/16 ⚠️                │
│                                     │
│  [Paste or type player names      ] │
│  [One name per line               ] │
│  [                                 ] │
│  [                                 ] │
│  [                                 ] │
│                                     │
│  [Import from CSV]  [Clear All]     │
│                                     │
│  Validation Errors:                 │
│  ⚠️ Need 2 more players             │
│                                     │
│         [Create Tournament]         │
│                                     │
└─────────────────────────────────────┘
```

**Input Handling**:
- Textarea accepts one name per line
- Auto-trim whitespace
- Remove empty lines
- Detect duplicates and warn
- Real-time counter: "X/16 players"

**Validation**:
- Exactly 16 unique names required
- Each name: 1-50 characters
- No special characters (alphanumeric + spaces only)
- Case-insensitive duplicate detection

**Step 3: Manual Seeding** (only if manual mode selected):
```
┌─────────────────────────────────────┐
│  Assign to Courts         [← Back]  │
├─────────────────────────────────────┤
│                                     │
│  Drag players to courts or use [▼]  │
│                                     │
│  Court 1 (4/4) ✅                   │
│  ┌───────────────────────────────┐ │
│  │ Alice    [Remove] [▼]         │ │
│  │ Bob      [Remove] [▼]         │ │
│  │ Carol    [Remove] [▼]         │ │
│  │ David    [Remove] [▼]         │ │
│  └───────────────────────────────┘ │
│                                     │
│  Court 2 (2/4) ⚠️                   │
│  ┌───────────────────────────────┐ │
│  │ Eve      [Remove] [▼]         │ │
│  │ Frank    [Remove] [▼]         │ │
│  │ [+ Add Player ▼]              │ │
│  │ [+ Add Player ▼]              │ │
│  └───────────────────────────────┘ │
│                                     │
│  Unassigned: 8 players              │
│                                     │
│         [Create Tournament]         │
│                                     │
└─────────────────────────────────────┘
```

**Requirements**:
- All 16 players must be assigned
- Exactly 4 players per court
- Validation prevents proceeding until complete

**Success State**:
- Tournament created with DRAFT status
- Redirect to tournament management page
- Flash success message

### 3. Tournament Management (`/tournament/[id]/manage`)

**Purpose**: Central control panel for active tournament.

**Layout**:
```
┌─────────────────────────────────────┐
│  Beach Bash 2024          [Menu ▼] │
│  Round 2 of 3 • Active              │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────┐ ┌─────────┐           │
│  │ Court 1 │ │ Court 2 │ ...       │
│  │ ● Ready │ │ ○ Wait  │           │
│  │ QR Code │ │ QR Code │           │
│  └─────────┘ └─────────┘           │
│                                     │
│  Progress: 6/12 matches complete    │
│  [████████░░░░░░░░░░░░] 50%         │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Court 1 Standings (Preview)   │ │
│  │ 1. Alice     63 pts  +21      │ │
│  │ 2. Bob       61 pts  +19      │ │
│  │ 3. Carol     58 pts  -12      │ │
│  │ 4. David     52 pts  -28      │ │
│  └───────────────────────────────┘ │
│  ... (other courts)                 │
│                                     │
│     [Close Round & Advance →]       │
│     (Enabled when all matches done) │
│                                     │
└─────────────────────────────────────┘
```

**Components**:

**Court Cards**:
- Court number
- Status indicator (ready/waiting for scores)
- QR code thumbnail (click to enlarge)
- Quick link to view court page

**Progress Indicator**:
- Overall tournament progress
- Matches completed / total
- Visual progress bar

**Standings Preview**:
- Live rankings per court
- Points and differential
- Updates as scores entered

**Round Control**:
- "Close Round" button (disabled until all matches complete)
- Confirmation dialog before closing
- Shows promotion/relegation preview

### 4. Court QR Codes (`/tournament/[id]/courts`)

**Purpose**: Display and print court access links.

**Layout**:
```
┌─────────────────────────────────────┐
│  Court Access Links       [Done]    │
├─────────────────────────────────────┤
│                                     │
│  Display these QR codes at courts:  │
│                                     │
│  ┌─────────┐    ┌─────────┐        │
│  │ ███████ │    │ ███████ │        │
│  │ ███████ │    │ ███████ │        │
│  │ ███████ │    │ ███████ │        │
│  │  COURT  │    │  COURT  │        │
│  │    1    │    │    2    │        │
│  └─────────┘    └─────────┘        │
│  [Copy URL]      [Copy URL]        │
│  [Download]      [Download]        │
│                                     │
│  ┌─────────┐    ┌─────────┐        │
│  │ ███████ │    │ ███████ │        │
│  │ ███████ │    │ ███████ │        │
│  │ ███████ │    │ ███████ │        │
│  │  COURT  │    │  COURT  │        │
│  │    3    │    │    4    │        │
│  └─────────┘    └─────────┘        │
│  [Copy URL]      [Copy URL]        │
│  [Download]      [Download]        │
│                                     │
│  [🖨️ Print All QR Codes]           │
│                                     │
└─────────────────────────────────────┘
```

**Features**:
- Large QR codes for easy scanning
- Court number clearly labeled
- Copy URL to clipboard
- Download individual QR code as PNG
- Print-optimized layout for all 4 courts

## Server Actions

### Tournament Creation

**Action**: `createTournament`

**Input**:
```typescript
{
  name: string;
  numRounds: number;
  seedingMode: 'random' | 'manual';
  players: string[]; // exactly 16 names
  initialCourts?: { // required if manual
    court1: [number, number, number, number]; // player indices
    court2: [number, number, number, number];
    court3: [number, number, number, number];
    court4: [number, number, number, number];
  }
}
```

**Validation**:
- User must be authenticated
- Name: 1-100 chars
- numRounds: 1-10
- Exactly 16 unique player names
- If manual: valid court assignments

**Process**:
1. Create tournament record
2. Create 16 player records
3. If random: shuffle and assign to courts
4. If manual: use provided assignments
5. Create court rotation for round 1
6. Create 12 matches (4 courts × 3 matches)
7. Generate 4 court access tokens
8. Return tournament ID

### Start Tournament

**Action**: `startTournament`

**Process**:
1. Validate tournament is in DRAFT state
2. Validate 16 players exist
3. Update status to ACTIVE
4. Set current_round to 1
5. Activate court access tokens
6. Return success

### Close Round

**Action**: `closeRound`

**Input**:
```typescript
{
  tournamentId: number;
  roundNumber: number;
}
```

**Validation**:
- All matches in round must be complete
- User must be tournament org

**Process**:
1. Calculate standings for each court
2. Determine promotions/relegations
3. Create next round court rotations
4. Create matches for next round
5. Generate new court access tokens
6. Deactivate old tokens
7. Update tournament current_round
8. If final round: mark COMPLETED
9. Return new court assignments

## Validation Rules

### Player Names
- Min length: 1 character
- Max length: 50 characters
- Allowed: alphanumeric, spaces, hyphens, apostrophes
- Must be unique within tournament (case-insensitive)
- Auto-trim whitespace

### Tournament Settings
- Name: required, max 100 chars
- Rounds: 1-10 (MVP constraint)
- Courts: fixed at 4

### State Transitions
- DRAFT → ACTIVE: Requires 16 players
- ACTIVE → ACTIVE: Valid only when closing round
- ACTIVE → COMPLETED: Valid only after final round
- COMPLETED → ARCHIVED: Always valid
- No other transitions allowed

## Error Handling

**Client-Side Errors**:
- Display inline validation messages
- Highlight invalid fields
- Prevent form submission until valid

**Server-Side Errors**:
- Return structured error objects
- Display toast notifications
- Common errors:
  - "Tournament not found"
  - "Unauthorized access"
  - "Invalid state transition"
  - "Missing required data"
  - "Database error"

## Edge Cases

1. **Browser refresh during creation**: Auto-save to localStorage
2. **Network failure**: Retry with exponential backoff
3. **Duplicate player names**: Case-insensitive check with warning
4. **Org leaves mid-tournament**: Tournament continues, another org can't take over
5. **Player drops out**: Must continue with 16, no substitutions in MVP

## Testing Strategy

**Unit Tests**:
1. Tournament state machine transitions
2. Player name validation
3. Court assignment algorithms

**E2E Tests**:
1. Complete tournament creation flow
2. Start tournament and verify court links
3. Close rounds and verify promotions
4. Complete tournament and verify standings
5. Error scenarios (invalid inputs, unauthorized access)

## Mobile Considerations

- Dashboard optimized for quick actions
- Create tournament uses step-by-step wizard
- QR code page optimized for displaying on phone then showing to others
- Large touch targets (min 44px)
- Bottom sheet for confirmations on mobile
