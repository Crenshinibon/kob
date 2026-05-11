# Virtual Court Shift Scheduling & Wait Time Forecasting

## Problem

When N virtual courts > M physical courts, players on virtual courts M+1 through N are waiting. They need to know:
- **When do I play next?** (which shift)
- **How long is my break?** (estimated wait time)

## Shift Model

### Execution Order

Virtual courts are played starting from the **lowest courts** (highest numbers) and working up to the **top courts** (lowest numbers). This ensures the top court match is last, so finalists are fresh.

**Example: 8 virtual courts, 4 physical courts**
```
Shift 1: Virtual courts 5-8 → Physical courts 1-4 (active)
Shift 2: Virtual courts 1-4 → Physical courts 1-4 (active)
```

**Example: 12 virtual courts, 4 physical courts**
```
Shift 1: Virtual courts 9-12 → Physical courts 1-4
Shift 2: Virtual courts 5-8  → Physical courts 1-4
Shift 3: Virtual courts 1-4  → Physical courts 1-4
```

**Final round**: Same order — loser courts first, top court last. This creates a dramatic finale where the championship match is the last match of the tournament.

### Physical Court Reassignment

When a physical court finishes its current virtual court assignment, it immediately gets the next waiting virtual court.

**Example: 8 virtual, 4 physical (starting from lower courts)**
```
Time 0:  PC1←VC5, PC2←VC6, PC3←VC7, PC4←VC8
         Waiting: VC1, VC2, VC3, VC4

Time 45min: PC2 finishes VC6 first
            PC2←VC1 (next in queue — top courts now)
            Waiting: VC2, VC3, VC4
            Players on VC1 now know: "You're up next on Physical Court 2"

Time 50min: PC4 finishes VC8
            PC4←VC2
            Waiting: VC3, VC4
```

**Key insight**: Within a shift, physical courts don't finish simultaneously. The fastest court gets the next virtual court first. This means the shift is "rolling" not "batched."

## Wait Time Forecasting

### After Each Court Completes

When a physical court finishes and gets reassigned, update the forecast for all waiting players:

```
VC5 players: "You're up next"
VC6 players: "1 court ahead of you"
VC7 players: "2 courts ahead of you"
VC8 players: "3 courts ahead of you"
```

Time estimates are based on average court duration × queue position. No live score tracking — we only know when games are complete.

### Forecast Calculation

```
Est. Wait = (Courts Ahead × Avg Court Duration) + Transition Overhead
```

Where:
- `Courts Ahead` = number of virtual courts still waiting before yours
- `Avg Court Duration` = calculated from game rules (see `650_game-rules-and-duration.md`)
- `Transition Overhead` = 5 min per physical court reassignment

### Forecast Limitations

We only know when games are **completed** (scores saved), not live progress. The forecast is based on:
- Average court duration from game rules
- Queue position (courts ahead)

No real-time score tracking — the progress indicator shows completed games only.

## UI Display

### Tournament View (Admin)

Show the shift schedule with game progress (games completed, not percentages — we don't get live scores):

```
┌─────────────────────────────────────────────────┐
│ Round 2 — Shift Schedule                         │
│                                                  │
│ ● ACTIVE                                         │
│   Physical Court 1 ← Virtual Court 1  (2/3)      │
│   Physical Court 2 ← Virtual Court 5  (0/3)      │
│   Physical Court 3 ← Virtual Court 3  (3/3)      │
│   Physical Court 4 ← Virtual Court 4  (1/3)      │
│                                                  │
│ ○ WAITING                                        │
│   Virtual Court 6  — next                         │
│   Virtual Court 7  — 1 court ahead                │
│   Virtual Court 8  — 2 courts ahead               │
│                                                  │
│ ✓ COMPLETED                                      │
│   Virtual Court 2  — finished at 14:32           │
└─────────────────────────────────────────────────┘
```

For 5p/6p courts, show 4 games: (0/4), (1/4), (2/4), (3/4), (4/4).

### Court Page (Players)

Players on waiting courts see their status:

```
┌─────────────────────────────────────────────┐
│ Virtual Court 6 — Round 2                    │
│                                              │
│ Status: WAITING                              │
│                                              │
│ 1 court ahead of you (Virtual Court 5)       │
│                                              │
│ Players:                                     │
│   Player A                                   │
│   Player B                                   │
│   Player C                                   │
│   Player D                                   │
└─────────────────────────────────────────────┘
```

### Dashboard (Overview)

```
Round 2 Progress: 2/8 courts complete
├─ Active: 4 courts (showing games completed per court)
├─ Waiting: 2 courts
└─ Est. round completion: based on avg court duration × remaining courts
```

## Database Considerations

### Court Status Tracking

Add status to `courtRotation`:

```typescript
status: text('status').default('waiting')  // 'waiting' | 'active' | 'completed'
startedAt: timestamp('started_at')
completedAt: timestamp('completed_at')
physicalCourtNumber: integer('physical_court_number')  // which physical court it's on
gamesCompleted: integer('games_completed').default(0)  // 0/3, 1/3, 2/3, 3/3 for 4p courts
```

The `gamesCompleted` counter updates each time a match score is saved. This is the only real-time data we have — no live scores during games.

### Forecast Cache

The forecast can be calculated on-the-fly from:
- Court durations (from game rules)
- Current court statuses
- Queue position

No need to persist forecasts — they're derived data.

## Algorithm: Shift Assignment

```typescript
function assignNextVirtualCourt(
  completedPhysicalCourt: number,
  waitingVirtualCourts: number[],
  activeCourts: Map<number, number>  // physical → virtual
): number | null {
  if (waitingVirtualCourts.length === 0) return null;
  
  const nextVirtual = waitingVirtualCourts.shift()!;
  activeCourts.set(completedPhysicalCourt, nextVirtual);
  return nextVirtual;
}

function calculateWaitTime(
  virtualCourtNumber: number,
  activeCourts: Map<number, { virtual: number, gamesCompleted: number, totalGames: number }>,
  waitingCourts: number[],
  avgCourtDuration: number,
  transitionTime: number
): number {
  const positionInQueue = waitingCourts.indexOf(virtualCourtNumber);
  if (positionInQueue === -1) return 0;  // already active or completed
  
  // Count how many courts need to finish before this one
  let courtsAhead = 0;
  
  // Currently active courts that will finish and take a waiting court
  for (const [physical, info] of activeCourts) {
    if (info.virtual < virtualCourtNumber) {
      courtsAhead++;
    }
  }
  
  // Waiting courts ahead in queue
  courtsAhead += positionInQueue;
  
  return courtsAhead * avgCourtDuration + courtsAhead * transitionTime;
}
```

## Edge Cases

1. **All physical courts finish simultaneously**: Assign next N virtual courts in order
2. **One court is very slow**: Other physical courts "leapfrog" — they take more virtual courts while the slow one is still playing
3. **Player leaves mid-wait**: Reschedule everything. The court configuration may change (e.g., 5p → 4p, or different leftover handling). All waiting players get new assignments.
4. **Score entry delayed**: Progress shows completed games only (0/3 → 1/3 → etc.). No live score tracking.

## Decisions (Previously Open Questions)

1. **Spectating while waiting**: Not possible — we don't have live scores.
2. **Historical court durations**: No. Use average court duration for all courts.
3. **Push notifications**: No. No real-time capabilities.
4. **Break activities**: No. Keep UI simple.
