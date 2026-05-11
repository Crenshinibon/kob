#!/usr/bin/env python3
"""Apply all remaining spec fixes after user review."""

# === 1. Fix 630: standings table + add new test tables ===
with open('/home/dirk/Dev/kob/specs/630_incomplete-implementation.md', 'r') as f:
    content = f.read()

# Replace standings table
old = """### Table: Standings Calculation + Tiebreaking

| Test Name | Players | Matches | Scenario | Expected |
|-----------|---------|---------|----------|----------|
| `standings-basic` | 4 | 3 | Clear winner | Highest total points first |
| `standings-tie-points` | 4 | 3 | Same points, different diff | Higher diff wins |
| `standings-tie-points-diff` | 4 | 3 | Same points and diff | Lower playerId wins |
| `standings-all-tied` | 4 | 3 | All same | Sorted by playerId |
| `standings-missing-scores` | 4 | 2 | 2 of 3 matches | Unscored = 0 for all |
| `standings-3player` | 3 | 3 | 3-player court | Same formula |
| `standings-5player` | 5 | 4 | 5-player parallel | Same formula, 5 rankings |
| `standings-6player` | 6 | 4 | 6-player parallel | Same formula, 6 rankings |"""

new = """### Table: Standings Calculation + Tiebreaking

| Test Name | Players | Court Size | Matches | Scenario | Expected |
|-----------|---------|------------|---------|----------|----------|
| `standings-basic` | 4 | 4p | 3 | Clear winner | Highest total points first |
| `standings-tie-points` | 4 | 4p | 3 | Same points, different diff | Higher diff wins |
| `standings-tie-points-diff` | 4 | 4p | 3 | Same points and diff | Lower playerId wins |
| `standings-all-tied` | 4 | 4p | 3 | All same | Sorted by playerId |
| `standings-missing-scores` | 4 | 4p | 2 | 2 of 3 matches | Unscored = 0 for all |
| `standings-3player` | 3 | 3p | 3 | 2v1 format | Avg pts/round formula |
| `standings-3player-tied` | 3 | 3p | 3 | All same avg | Lower playerId wins |
| `standings-5player-equal` | 5 | 5p | 4 | Equal avg across all | Total pts tiebreaker |
| `standings-5player-uneven` | 5 | 5p | 4 | Mixed 3/4 game counts | Normalized avg ranks higher |
| `standings-6player-mixed` | 6 | 6p | 4 | Mixed 2/3 game counts | Normalized avg ranks higher |
| `standings-cross-size` | Mixed | 4p+3p | — | Cross-court-size comparison | Avg pts/round normalizes first |"""

content = content.replace(old, new)
assert old not in content, "Old standings table still present in 630"

# Add scheduling mode and variable court normalization test tables after Round Count
old2 = """| `rounds-16-preseed` | 16 | preseed | 5 |

### Table: Standings Calculation + Tiebreaking"""

new2 = """| `rounds-16-preseed` | 16 | preseed | 5 |

### Table: Scheduling Mode Configuration

| Test Name | Virtual Courts | Physical Courts | Mode | Expected Shifts | Expected Wait (approx) |
|-----------|---------------|-----------------|------|----------------|----------------------|
| `batch-8v4` | 8 | 4 | batch | 2 shifts [5-8],[1-4] | ~55 min for Shift 1 |
| `batch-12v4` | 12 | 4 | batch | 3 shifts [9-12],[5-8],[1-4] | ~100 min for Shift 1 |
| `rolling-8v4` | 8 | 4 | rolling | No shifts, continuous | Variable per position |
| `batch-vs-rolling-equivalence` | 8 | 4 | both | Same total round duration | Different per-player distribution |

### Table: Variable Court Standings Normalization

| Test Name | Court Size | Games/Player | Input Scenario | Expected Avg | Expected Rank |
|-----------|-----------|-------------|----------------|--------------|---------------|
| `norm-3p-equal` | 3p | 3 | All 21 pts each | 21.0 | Tie by playerId |
| `norm-5p-uneven` | 5p | 3 & 4 | 3-game: 63 total, 4-game: 48 total | 21.0 vs 12.0 | 3-game player ranks higher |
| `norm-6p-uneven` | 6p | 3 & 2 | 3-game: 63 total, 2-game: 30 total | 21.0 vs 15.0 | 3-game player ranks higher |
| `norm-tiebreak-diff` | 5p | 3 & 4 | Same avg | Higher total pts wins | Total pts is tiebreaker |
| `norm-tiebreak-id` | 5p | 3 & 4 | Same avg, same total | Lower playerId wins | playerId is final tiebreaker |

### Table: Standings Calculation + Tiebreaking"""

content = content.replace(old2, new2)
assert old2 not in content, "Old round count table section not found in 630"

with open('/home/dirk/Dev/kob/specs/630_incomplete-implementation.md', 'w') as f:
    f.write(content)
print("630: Test tables added successfully")


# === 2. Fix 620: Add serving rotation note ===
with open('/home/dirk/Dev/kob/specs/620_incomplete-options.md', 'r') as f:
    content = f.read()

old = "For 1-2 leftover players: one full court with two parallel game tracks running simultaneously. The rotating player swaps after every point, and each swap feeds into a separate game score. Roles rotate between the two runs within each round."

if old in content:
    new = old + " **Serving rotation**: The rotating player maintains correct serving order relative to the fixed players — the same standard volleyball serve-rotation rules apply as in regular 2v2 games."
    content = content.replace(old, new)
    print("620: Serving rotation note added")
else:
    print("620: Serving rotation note already present or text changed")

# Remove "(Option D)" references
old2 = "(Option D)"
if old2 in content:
    content = content.replace(old2, "")
    print("620: Option D references removed")
else:
    print("620: No Option D references found")

with open('/home/dirk/Dev/kob/specs/620_incomplete-options.md', 'w') as f:
    f.write(content)


# === 3. Fix 650: Consistent ranking description ===
with open('/home/dirk/Dev/kob/specs/650_game-rules-and-duration.md', 'r') as f:
    content = f.read()

old_table = """| 4p Rule | 3p Court | 5p Court | 6p Court |
|---------|----------|----------|----------|
| Single set to 21 | Single set to 21 | Single set to 15 | Single set to 15 |
| Best-of-3 to 15 | Best-of-3 to 15 | Single set to 15 | Single set to 15 |
| Win by 2 | Win by 2 | Win by 2 | Win by 2 |
| 3 games/round | 3 games/round | 4 parallel games/round | 4 parallel games/round |
| Ranking: total pts | Ranking: total pts | Ranking: avg pts/round | Ranking: avg pts/round |"""

new_table = """| 4p Rule | 3p Court | 5p Court | 6p Court |
|---------|----------|----------|----------|
| Single set to 21 | Single set to 21 | 1 set to 15 (default) or configurable | 1 set to 15 (default) or configurable |
| Best-of-3 to 15 | Best-of-3 to 15 | Single set to 15 | Single set to 15 |
| Win by 2 | Win by 2 | Win by 2 | Win by 2 |
| 3 games/round | 3 games/round | 4 parallel games/round | 4 parallel games/round |
| Ranking: total pts | Ranking: total pts | Ranking: avg pts/round | Ranking: avg pts/round |"""

if old_table in content:
    content = content.replace(old_table, new_table)
    print("650: Rule inference table updated")
else:
    print("650: Rule inference table already updated or not found")

old_para = "**Rationale for 5p/6p defaults**: Two parallel game tracks (15pt each), interleaved by rotating players every point, done in 2 runs = 4 games total. Not truly parallel — approximately same duration as a single game + 10% overhead for player switches. Ranking by average points per round normalizes for unequal game counts."

if old_para in content:
    new_para = "**Rationale for 5p/6p defaults**: Two parallel game tracks (15pt each), interleaved by rotating players every point, done in 2 runs = 4 games total. Not truly parallel — approximately same duration as a single game + 10% overhead for player switches. Because players play different numbers of games (3 or 4 in 5-player; 2 or 3 in 6-player), ranking uses **average points per round** to normalize performance. Ties are broken by total points (more data = advantage), then differential, then playerId. For 3-player courts, all players play the same number of games, so standard total-points ranking applies."
    content = content.replace(old_para, new_para)
    print("650: Ranking rationale paragraph updated")
else:
    print("650: Ranking rationale already updated or not found")

# Remove courtRuleOverride already done earlier; verify it's gone
if "courtRuleOverride" in content:
    print("650: WARNING — courtRuleOverride still present!")
else:
    print("650: courtRuleOverride confirmed removed")

with open('/home/dirk/Dev/kob/specs/650_game-rules-and-duration.md', 'w') as f:
    f.write(content)


# === 4. Fix 670: calculateRetiredStanding — destination court size ===
with open('/home/dirk/Dev/kob/specs/670_player-retirement.md', 'r') as f:
    content = f.read()

old_desc = ("**Non-standard court rule**: The non-standard court (3p/5p/6p) is always the last court. "
            "Final standing = position on that court + 4 × (number of courts before it).")

new_desc = ("**Non-standard court rule**: The non-standard court (3p/5p/6p) is always the last court. "
            "Final standing = position on the destination court + 4 × (number of courts before it). "
            "The destination court size (not the player's original court size) determines the worst "
            "possible position.")

if old_desc in content:
    content = content.replace(old_desc, new_desc)
    print("670: Description updated for destination court size")
else:
    print("670: Description already updated")

old_func = ("  courtSize: number  // 3, 4, 5, or 6\n)")
new_func = ("  courtSizesByCourt: number[]  // array of court sizes indexed by court number (1-based)\n)")

if "courtSizesByCourt" not in content:
    content = content.replace(old_func, new_func)
    print("670: Function parameter updated")
else:
    print("670: Function parameter already updated")

old_worst_pos = ("const worstPositionOnCourt = (worstCourt === totalCourts && courtSize !== 4) ? courtSize : 4;")
new_worst_pos = ("const destCourtSize = courtSizesByCourt[worstCourt - 1];  // 0-indexed array\n    const worstPositionOnCourt = destCourtSize;  // worst position = last place on that court")

if old_worst_pos in content:
    content = content.replace(old_worst_pos, new_worst_pos)
    print("670: Worst position calculation fixed")
elif "destCourtSize" in content:
    print("670: Worst position calculation already fixed")
else:
    print("670: WARNING — could not find worst position calculation")

with open('/home/dirk/Dev/kob/specs/670_player-retirement.md', 'w') as f:
    f.write(content)

# Also clean up "(Option D)" references in 670
with open('/home/dirk/Dev/kob/specs/670_player-retirement.md', 'r') as f:
    content = f.read()

if "(Option D)" in content:
    content = content.replace(" (Option D)", "")
    print("670: Option D references removed")
else:
    print("670: No Option D references to remove")

with open('/home/dirk/Dev/kob/specs/670_player-retirement.md', 'w') as f:
    f.write(content)


# === 5. Verify all Option D references are gone from all 6xx specs ===
import glob
import os

specs_dir = '/home/dirk/Dev/kob/specs'
for f in sorted(glob.glob(os.path.join(specs_dir, '6*.md'))):
    with open(f) as fh:
        if 'Option D' in fh.read():
            print(f"WARNING: {os.path.basename(f)} still contains 'Option D'")

print("\n=== All fixes applied ===")