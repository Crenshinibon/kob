# Court Shift Scheduling

## Problem

When N virtual courts > M physical courts, players on virtual courts M+1 through N are waiting. They need to know:
- **When do I play next?** (which shift)
- **How long is my break?** (estimated wait time)

## Batch Shift Model (The Only Mode)

All virtual courts are played in **batch shifts**. Each shift assigns up to M virtual courts to M physical courts playing simultaneously. A new shift starts only after **all** courts in the current shift have finished — even if some individual matches completed earlier.

Shifts proceed from **lowest priority courts first** (highest virtual court numbers), working up to **top courts** (lowest virtual court numbers). This ensures the top court match is last, so finalists are fresh.

**Example: 8 virtual courts, 4 physical courts**
```
Shift 1: Virtual courts 5-8 → Physical courts 1-4 (simultaneous)
[WAIT]  Score entry, redistribution, rest (~10 min transition)
Shift 2: Virtual courts 1-4 → Physical courts 1-4 (simultaneous)
```

**Example: 12 virtual courts, 4 physical courts**
```
Shift 1: Virtual courts  9-12 → Physical courts 1-4
[WAIT]  Score entry, redistribution, rest (~10 min transition)
Shift 2: Virtual courts  5-8  → Physical courts 1-4
[WAIT]  Score entry, redistribution, rest (~10 min transition)
Shift 3: Virtual courts  1-4  → Physical courts 1-4
```

**Transition period**: Between shifts there is a break (default 10 min) for score recording, redistribution, and player rest. This gives all players on the next shift the same break duration.

**Final round**: Same ordering — loser courts first, top court last. This creates a dramatic finale where the championship match is the last match of the tournament.

## Why Not Rolling Assignment?

An earlier version of this spec proposed a "Rolling Assignment" mode where a physical court that finishes early would immediately pick up the next waiting virtual court, without waiting for all courts in the current shift to finish.

**Rolling was removed** for the following reasons:

1. **Player retirement breaks the model.** If a player retires mid-tournament, players who already started the next round on "looser" courts could be promoted to different courts, invalidating the already-in-progress assignments. Batch shifts avoid this by only starting redistribution when all courts in a round are complete.

2. **Predictability.** Batch shifts give every player a known break duration between their matches. With rolling, some players get very short breaks while others wait much longer — this becomes a fairness lottery across rounds.

3. **Org management.** Running a rolling schedule requires the organizer to constantly monitor which courts finished and reassign players. Batch shifts are simpler: "everyone on break, next shift starts in 5 minutes."

4. **No real-time infrastructure.** Rolling mode requires live court completion notifications (WebSocket/polling) which exceeds the current app's scope. Batch shifts work with the existing request-response architecture.

## Batch Wait Time Forecasting

In batch mode, all courts in a shift start and (approximately) finish together. Wait time is calculated per-shift:

```
Est. Wait for Shift S = (Remaining Shifts × Avg Court Duration) + (Remaining Shifts × Transition Time)
```

Where:
- `Remaining Shifts` = number of shifts after yours
- `Avg Court Duration` = estimated from game rules
- `Transition Time` = configured transition time between shifts (default 10 min)

**Example**: 12 virtual courts, 4 physical courts. Player on VC5 is in Shift 2:
- 1 remaining shift after theirs (Shift 3: VC1-VC4)
- Avg court duration: 45 min
- Transition time: 10 min
- Their shift: 45 min
- Total time from now: ~100 min

## Batch Shift Assignment Algorithm

```typescript
function getBatchShifts(
    virtualCourtCount: number,
    physicalCourtCount: number
): number[][] {
    const shifts: number[][] = [];
    const courtQueue: number[] = [];
    // Reverse order: highest-numbered virtual courts first (bottom courts go first)
    for (let i = virtualCourtCount; i >= 1; i--) {
        courtQueue.push(i);
    }
    while (courtQueue.length > 0) {
        const shift: number[] = [];
        for (let i = 0; i < physicalCourtCount && courtQueue.length > 0; i++) {
            shift.push(courtQueue.pop()!);
        }
        shifts.push(shift);
    }
    return shifts;
}
// Example: getBatchShifts(8, 4) → [[5,6,7,8], [1,2,3,4]]
// Example: getBatchShifts(12, 4) → [[9,10,11,12], [5,6,7,8], [1,2,3,4]]
```

## UI Display

### Tournament View (Admin)
```
┌─────────────────────────────────────────────────┐
│ Round 2 — Shift Schedule                          │
│                                                  │
│ ▶ ACTIVE (Shift 1 of 2)                          │
│   Physical Court 1 ← Virtual Court 5  (2/3)      │
│   Physical Court 2 ← Virtual Court 6  (0/3)      │
│   Physical Court 3 ← Virtual Court 7  (3/3)      │
│   Physical Court 4 ← Virtual Court 8  (1/3)      │
│                                                  │
│ ○ WAITING                                         │
│   Virtual Court 1  — up next (Shift 2)           │
│   Virtual Court 2  — up next (Shift 2)           │
│   Virtual Court 3  — up next (Shift 2)           │
│   Virtual Court 4  — up next (Shift 2)           │
│                                                  │
│ Est. round completion: ~40 min                    │
└─────────────────────────────────────────────────┘
```

### Player Waiting View
```
┌─────────────────────────────────────────────┐
│ Virtual Court 2 — Round 2                    │
│                                              │
│ Status: WAITING — Shift 2 of 2              │
│                                              │
│ 🕐 Est. wait: ~45 min                        │
│   (Shift 1 in progress, ~35 min remaining   │
│    + 10 min transition)                      │
│                                              │
│ Players:                                     │
│   Player A                                   │
│   Player B                                   │
│   Player C                                   │
│   Player D                                   │
└─────────────────────────────────────────────┘
```

## Edge Cases

1. **All physical courts finish simultaneously**: Start next shift immediately, no transition time needed (or minimal 2-min reset).
2. **One court is very slow**: Other courts wait. This is intentional — batch mode waits for all courts to finish.
3. **Player leaves mid-wait**: Handle through player retirement flow. The court configuration may change.
4. **Score entry delayed**: Progress shows completed games only (0/3 → 1/3 → etc.). No live score tracking.
5. **Physical court becomes unavailable**: Reassign all virtual courts on that physical court to remaining available courts.

## Decisions

1. **Only batch mode.** Rolling was removed per spec update 2026-05-13. See "Why Not Rolling" section above.
2. **Spectating while waiting**: Not possible — no live scores.
3. **Historical court durations**: No. Use average court duration for all courts.
4. **Push notifications**: No. No real-time capabilities.
5. **Break activities**: No. Keep UI simple.
6. **Batch transition time**: 10 min default.
7. **Fairness**: Wait times are relatively equal within a shift since all courts start and finish together in batch mode.
