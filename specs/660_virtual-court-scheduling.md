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
VC5 players: "You're up next — ~5 min until your court starts"
VC6 players: "1 court ahead of you — ~50 min wait"
VC7 players: "2 courts ahead of you — ~1h 40min wait"
VC8 players: "3 courts ahead of you — ~2h 30min wait"
```

### Forecast Calculation

```
Est. Wait = (Courts Ahead × Avg Court Duration) + Transition Overhead
```

Where:
- `Courts Ahead` = number of virtual courts still waiting before yours
- `Avg Court Duration` = calculated from game rules (see `650_game-rules-and-duration.md`)
- `Transition Overhead` = 5 min per physical court reassignment

### More Precise Forecast

When a specific physical court is playing, we can estimate its remaining time:

```
VC5 Wait = PC2 Remaining Time + Transition
VC6 Wait = min(PC1, PC3, PC4 Remaining) + PC2 Remaining + 2 × Transition
...
```

But this is complex. **Simple approach**: use average court duration × queue position.

## UI Display

### Tournament View (Admin)

Show the shift schedule with live status:

```
┌─────────────────────────────────────────────┐
│ Round 2 — Shift Schedule                     │
│                                              │
│ ● ACTIVE                                     │
│   Physical Court 1 ← Virtual Court 1  [45%]  │
│   Physical Court 2 ← Virtual Court 5  [12%]  │
│   Physical Court 3 ← Virtual Court 3  [78%]  │
│   Physical Court 4 ← Virtual Court 4  [62%]  │
│                                              │
│ ○ WAITING                                    │
│   Virtual Court 6  — ~50 min                 │
│   Virtual Court 7  — ~1h 40min               │
│   Virtual Court 8  — ~2h 30min               │
│                                              │
│ ✓ COMPLETED                                  │
│   Virtual Court 2  — finished at 14:32       │
└─────────────────────────────────────────────┘
```

### Court Page (Players)

Players on waiting courts see their status:

```
┌─────────────────────────────────────────────┐
│ Virtual Court 6 — Round 2                    │
│                                              │
│ Status: WAITING                              │
│                                              │
│ Your estimated start time: ~14:45            │
│ Wait time: ~50 minutes                       │
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
├─ Active: 4 courts
├─ Waiting: 2 courts (~1h 30min remaining)
└─ Est. round completion: ~15:30
```

## Database Considerations

### Court Status Tracking

Add status to `courtRotation`:

```typescript
status: text('status').default('waiting')  // 'waiting' | 'active' | 'completed'
startedAt: timestamp('started_at')
completedAt: timestamp('completed_at')
physicalCourtNumber: integer('physical_court_number')  // which physical court it's on
```

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
  activeCourts: Map<number, { virtual: number, estimatedRemaining: number }>,
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
3. **Player leaves mid-wait**: Their spot on the virtual court stays — they're still expected to play when their turn comes
4. **Score entry delayed**: Forecast is based on actual completion time (when scores are saved), not estimated time

## Open Questions

1. **Should players on waiting courts be able to see scores from active courts?** (Spectating while waiting)
2. **Should the forecast account for historical court durations?** (e.g., Court 3 tends to be slower than Court 1)
3. **Push notifications**: Should the system notify players when their court is "up next"? (Out of scope for now — no real-time)
4. **Break activities**: Should the UI suggest break activities? (e.g., "You have ~1 hour — grab food, warm up")
