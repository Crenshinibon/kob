# Virtual Court Shift Scheduling & Wait Time Forecasting

## Problem

When N virtual courts > M physical courts, players on virtual courts M+1 through N are waiting. They need to know:
- **When do I play next?** (which shift)
- **How long is my break?** (estimated wait time)

## Scheduling Mode: Org Choice at Tournament Creation

The organizer selects a **Scheduling Mode** when creating the tournament (defaults to Batch):

| Mode | Label | Description | Best For |
|------|-------|-------------|----------|
| `batch` | **Batch Shifts** | All virtual courts in a shift play simultaneously. When all courts in the shift finish, the next shift begins. | Predictable timing, larger tournaments |
| `rolling` | **Rolling Assignment** | When any physical court finishes, it immediately takes the next waiting virtual court. | Smaller gaps, faster overall play, fewer idle courts |

The default is `batch`. The org can choose either mode. The mode applies to all rounds of the tournament.

> **Why a choice?** Batch shifts are easier to manage and more predictable for players ("everyone on break, next shift starts in 5 minutes"). Rolling is more efficient but harder to forecast. Let the org decide based on their venue and player expectations.

---

## Batch Shift Model (Default)

### Execution Order

Virtual courts are played in **shifts**. Each shift assigns up to M virtual courts to M physical courts. Shifts proceed from **lowest courts first** (highest numbers), working up to **top courts** (lowest numbers). This ensures the top court match is last, so finalists are fresh.

**Key distinction from Rolling**: A new shift starts only after **all** courts in the current shift have finished — even if some individual matches completed earlier. This makes batch predictable but potentially slower.

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

**Final round**: Same ordering — loser courts first, top court last. This creates a dramatic finale where the championship match is the last match of the tournament.

### Batch Wait Time Forecasting

In batch mode, all courts in a shift start and (approximately) finish together. Wait time is calculated per-shift:

```
Est. Wait for Shift S = (Remaining Shifts × Avg Court Duration) + (Remaining Shifts × Transition Time)
```

Where:
- `Remaining Shifts` = number of shifts after yours (including transition to your shift and within your shift)
- `Avg Court Duration` = calculated from game rules (see `650_game-rules-and-duration.md`)
- `Transition Time` = configured transition time between shifts

**Example**: 12 virtual courts, 4 physical courts. Player on VC5 is in Shift 2:
- 1 remaining shift after theirs (Shift 3: VC1-VC4)
- Avg court duration: 45 min
- Transition time: 10 min
- Est. Wait = 1 × 45 + 1 × 10 = **55 min** (after their shift finishes)
- Plus their own shift duration: **45 min**
- Total time from now: **~100 min**

---

## Rolling Assignment Model

### Execution Order

When a physical court finishes its current virtual court assignment, it **immediately** gets the next waiting virtual court. There are no explicit "shifts" — assignment is continuous.

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

Time 55min: PC1 finishes VC5
            PC1←VC3
            Waiting: VC4

Time 60min: PC3 finishes VC7
            PC3←VC4
            All done.
```

**Key behavior**: Within the initial assignment, physical courts don't finish simultaneously. The fastest court gets the next waiting virtual court first. This means some players get shorter breaks, others longer.

### Rolling Wait Time Forecasting

```
Est. Wait = (Courts Ahead × Avg Court Duration) + (Courts Ahead × Transition Overhead)
```

Where:
- `Courts Ahead` = number of virtual courts still in play before yours in the queue
- `Avg Court Duration` = calculated from game rules
- `Transition Overhead` = 5 min per physical court reassignment (shorter than batch transitions)

**Example**: 8 virtual, 4 physical. Player on VC7 (waiting):
- Currently active: VC5, VC6, VC7 (just started), VC8
- VC5 finishes first → now VC4 enters a court
- VC6 finishes → VC3 enters
- VC7 finishes → VC2 enters
- VC8 finishes → VC1 enters
- VC7 player waited for 2 courts ahead × 45 min + 2 × 5 min = **~100 min**

### Fairness Consideration

In rolling mode, the initial queue position determines wait time. Over multiple rounds, this tends to even out as different courts finish in different orders each round. The system does NOT guarantee equal play-to-wait ratios across rounds.

---

## UI Display

### Batch Mode Display

#### Tournament View (Admin)
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
│ ✓ COMPLETED                                      │
│   Virtual Court 2  — finished at 14:32           │
│                                                  │
│ Est. round completion: ~40 min                    │
└─────────────────────────────────────────────────┘
```

For 5p/6p courts, show 4 games: (0/4), (1/4), (2/4), (3/4), (4/4).

#### Player Waiting View (Batch)
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

### Rolling Mode Display

#### Tournament View (Admin)
```
┌─────────────────────────────────────────────────┐
│ Round 2 — Rolling Schedule                       │
│                                                  │
│ ● ACTIVE (4 courts running)                      │
│   PC1←VC3  (1/3)  │ Next up: VC1                 │
│   PC2←VC5  (3/3)  │ Next up: VC2                 │
│   PC3←VC1  (2/3)  │ Next up: VC4                 │
│   PC4←VC8  (0/3)  │ Next up: VC6                 │
│                                                  │
│ ○ WAITING                                         │
│   VC2  — 3 courts ahead                          │
│   VC4  — 2 courts ahead                          │
│   VC6  — 1 court ahead                           │
│   VC7  — next in queue                           │
│                                                  │
│ ✓ COMPLETED                                      │
│   VC9  — finished at 14:32                       │
└─────────────────────────────────────────────────┘
```

#### Player Waiting View (Rolling)
```
┌─────────────────────────────────────────────┐
│ Virtual Court 6 — Round 2                    │
│                                              │
│ Status: WAITING                              │
│                                              │
│ 🕐 Est. wait: ~55 min                        │
│   (1 court ahead, ~45 min + 5 min +         │
│    1 court, ~45 min + 5 min)                 │
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
├─ Mode: ▶ Batch (Shift 1 of 2)
├─ Active: 4 courts
├─ Waiting: 2 courts
└─ Est. round completion: ~55 min
```

---

## Algorithm: Batch Shift Assignment

```typescript
function getBatchShifts(
    virtualCourtCount: number,
    physicalCourtCount: number
): number[][] {
    const shifts: number[][] = [];
    // Courts in reverse order: lowest numbered last
    const courtQueue: number[] = [];
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

## Algorithm: Rolling Assignment

```typescript
function handleCourtCompletion(
    completedPhysicalCourt: number,
    waitingVirtualCourts: number[],
    activeCourts: Map<number, number>, // physical → virtual
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
    if (positionInQueue === -1) return 0; // already active or completed

    let courtsAhead = 0;

    // Active courts: estimate how many will finish before us
    // A court "ahead" of us will finish and take a waiting court before ours
    for (const [, info] of activeCourts) {
        // Courts with lower virtual numbers or fewer games remaining will likely finish first
        const progress = info.gamesCompleted / info.totalGames;
        if (progress > 0) courtsAhead++;
    }

    courtsAhead += positionInQueue;

    return courtsAhead * avgCourtDuration + courtsAhead * transitionTime;
}
```

---

## Database Considerations

### Court Status Tracking

Add fields to `courtRotation`:

```typescript
status: text('status').default('waiting')  // 'waiting' | 'active' | 'completed'
startedAt: timestamp('started_at')
completedAt: timestamp('completed_at')
physicalCourtNumber: integer('physical_court_number')  // which physical court it's on
gamesCompleted: integer('games_completed').default(0)  // 0/3, 1/3, 2/3, 3/3 for 4p courts
```

### Scheduling Mode

Add to `tournament` table (see `630_incomplete-implementation.md` Phase 2):

```typescript
schedulingMode: text('scheduling_mode').default('batch')  // 'batch' | 'rolling'
```

### Shift Records (Batch Mode Only)

New table for batch shift tracking:

```typescript
// shift_record — tracks which shift each virtual court belongs to
{
    id: serial('id').primaryKey(),
    tournamentId: integer('tournament_id').notNull(),
    roundNumber: integer('round_number').notNull(),
    virtualCourtNumber: integer('virtual_court_number').notNull(),
    shiftNumber: integer('shift_number').notNull(),
    physicalCourtNumber: integer('physical_court_number'),  // assigned when shift starts
}
```

The forecast can be calculated on-the-fly from court durations, current court statuses, and queue position. No need to persist forecasts — they're derived data.

---

## Edge Cases

1. **All physical courts finish simultaneously (batch)**: Start next shift immediately, no transition time needed (or minimal 2-min reset).
2. **All physical courts finish simultaneously (rolling)**: Assign all waiting courts in order, lowest virtual to fastest physical.
3. **One court is very slow (rolling)**: Other physical courts "leapfrog" — they take more virtual courts while the slow one is still playing. The waiting players behind the slow court benefit from faster players ahead of them in the queue.
4. **Player leaves mid-wait**: Reschedule everything. The court configuration may change (e.g., 5p → 4p, or different leftover handling). All waiting players get new assignments and updated wait estimates.
5. **Score entry delayed**: Progress shows completed games only (0/3 → 1/3 → etc.). No live score tracking.
6. **Physical court becomes unavailable**: Reassign all virtual courts on that physical court to remaining available courts. May require a brief transition.

---

## Decisions (Previously Open Questions)

1. **Scheduling mode**: Org chooses at tournament creation. Batch (default) or Rolling.
2. **Spectating while waiting**: Not possible — we don't have live scores.
3. **Historical court durations**: No. Use average court duration for all courts.
4. **Push notifications**: No. No real-time capabilities.
5. **Break activities**: No. Keep UI simple.
6. **Batch transition time**: 10 min default, configurable by org.
7. **Rolling transition overhead**: 5 min per reassignment (shorter than batch — no full-shift reset).
8. **Fairness in rolling**: Not guaranteed equal per round; tends to even out over full tournament.