# Score Saving UX Improvements

## Problem

When entering scores on mobile devices, users lack immediate feedback after clicking "SAVE". On slow networks or with server latency, the button appears unresponsive for a moment, leading to confusion and potential double-submissions.

## Root Cause

The original implementation had a reactivity bug: `savingMatches.add()` and `savingMatches.delete()` modify the Set in-place, but Svelte 5's `$state` requires reassignment to trigger reactivity.

```js
// BEFORE - doesn't trigger reactivity
savingMatches.add(match.id);
await submit();
savingMatches.delete(match.id);

// AFTER - properly triggers reactivity
savingMatches = new Set([...savingMatches, match.id]);
await submit();
savingMatches = new Set([...savingMatches].filter((id) => id !== match.id));
```

## Solution Implemented (Option A: Immediate UI Feedback)

### Changes Made

1. **Fixed reactivity bug** - Changed Set mutations to reassignments that trigger Svelte 5 reactivity
2. **Added `:active` button state** - CSS `:active` selector provides instant visual feedback on press (scale down 5%)
3. **Improved error handling** - Added `finally` block to ensure state is always cleaned up

### Code Changes

**File**: `src/routes/court/[token]/+page.svelte`

```svelte
.enhance(async ({ submit }) => {
	// Immediate state update (triggers reactivity)
	savingMatches = new Set([...savingMatches, match.id]);
	try {
		await submit();
		if (isEditing) {
			editingMatches = new Set([...editingMatches].filter((id) => id !== match.id));
		}
	} catch (error) {
		console.log(error);
	} finally {
		// Always clean up
		savingMatches = new Set([...savingMatches].filter((id) => id !== match.id));
	}
})
```

**CSS**:

```css
.btn-primary:active:not(:disabled) {
	transform: scale(0.95);
}
```

## Future Enhancements (Not Implemented)

### Haptic Feedback

For devices that support it, add vibration on button press:

```js
// In enhance callback
if ('vibrate' in navigator) {
	navigator.vibrate(10);
}
```

### Optimistic Updates (Option B)

If users still feel the experience is slow, consider implementing optimistic updates where the "completed" state appears immediately while the save happens in background. See the original spec below for details.

---

## Original Analysis (For Reference)

## Current Implementation

The court score page (`src/routes/court/[token]/+page.svelte`) uses:

- A `savingMatches` Set to track which matches are being saved
- Button text changes to "Saving..." with a spinner
- Button is disabled during save

However, the state update has a small delay before the UI re-renders, making the button feel unresponsive initially.

## Proposed Solutions

### Option A: Immediate UI Feedback (Simpler)

**Approach**: Ensure the button state changes immediately on click, before any async operations.

**Implementation**:

1. Use synchronous state update at the start of the enhance callback
2. Add visual "pressed" state on mousedown for instant tactile feedback
3. Potentially add haptic feedback via `navigator.vibrate()` on supported devices

**Pros**:

- Simple implementation
- No complex state management
- Predictable behavior (what you see is what gets saved)
- Works well with existing architecture

**Cons**:

- User still waits for server response
- No instant "completed" feeling

**Code changes**:

```svelte
<form
	{...saveScore
		.for(match.id)
		.preflight(scoreSchema)
		.enhance(async ({ submit }) => {
			// Immediate synchronous state update
			savingMatches = new Set([...savingMatches, match.id]);

			try {
				await submit();
				// Exit edit mode after successful save
				if (isEditing) {
					editingMatches = new Set([...editingMatches].filter((id) => id !== match.id));
				}
			} catch (error) {
				console.log(error);
			} finally {
				savingMatches = new Set([...savingMatches].filter((id) => id !== match.id));
			}
		})}
>
```

Additional CSS for instant visual feedback:

```css
.btn-primary:active {
	transform: scale(0.95);
	background-color: var(--accent-primary-hover);
}
```

---

### Option B: Optimistic Updates (More Complex)

**Approach**: Immediately show the "completed" state while the save happens in the background. Roll back on error.

**Implementation**:

1. Immediately add match to `completedMatches` and store scores locally
2. Submit in background
3. On error, remove from `completedMatches` and show error
4. On success, sync with server response

**Pros**:

- Instant feedback - feels much faster
- Better UX on slow connections
- User can move to next match immediately

**Cons**:

- More complex state management
- Potential for confusion if save fails
- Need to handle rollback gracefully
- Standings calculation needs to handle pending scores

**Code changes**:

```svelte
<script>
	let savingMatches = $state<Set<number>>(new Set());
	let completedMatches = $state<Set<number>>(new Set());
	let matchData = $state<Record<number, { teamAScore: number; teamBScore: number }>>({});
	let pendingScores = $state<Record<number, { teamAScore: number; teamBScore: number }>>({});

	async function handleOptimisticSave(matchId: number, formData: FormData) {
		const teamAScore = parseInt(formData.get('teamAScore') as string);
		const teamBScore = parseInt(formData.get('teamBScore') as string);

		// 1. Optimistic update - immediately show completed
		pendingScores[matchId] = { teamAScore, teamBScore };
		matchData[matchId] = { teamAScore, teamBScore };
		completedMatches = new Set([...completedMatches, matchId]);

		try {
			// 2. Submit to server
			await submit();
			delete pendingScores[matchId];
		} catch (error) {
			// 3. Rollback on error
			delete matchData[matchId];
			delete pendingScores[matchId];
			completedMatches = new Set([...completedMatches].filter(id => id !== matchId));
			// Show error to user
			showError(`Failed to save score: ${error.message}`);
		}
	}
</script>

<!-- Form with optimistic enhance -->
<form
	{...saveScore
		.for(match.id)
		.preflight(scoreSchema)
		.enhance(async ({ formData, submit }) => {
			await handleOptimisticSave(match.id, formData);
		})}
>
```

For standings with pending scores:

```svelte
{#if Object.keys(pendingScores).length > 0}
	<div class="pending-notice">
		Saving {Object.keys(pendingScores).length} score(s)...
	</div>
{/if}
```

---

## Recommendation

**For mobile beach volleyball scenario**: **Option A (Immediate UI Feedback)** is recommended.

Reasons:

1. **Reliability over speed**: On the beach with spotty connectivity, users need to be certain their scores saved
2. **Simple mental model**: Users see exactly what the server sees - no confusion about pending states
3. **Lower implementation risk**: Less complexity means fewer edge cases and bugs
4. **Quick win**: Can be implemented and tested in one session

If Option A doesn't feel responsive enough after testing, we can incrementally add:

- Haptic feedback (`navigator.vibrate(10)`)
- Sound feedback (subtle "click" sound)
- More aggressive CSS transitions

## Implementation Plan

1. **Fix immediate state update** - Move state update to start of enhance callback
2. **Add active/pressed button state** - CSS :active selector for instant visual feedback
3. **Consider haptic feedback** - Add `navigator.vibrate(10)` on button press for supported devices
4. **Test on slow network** - Use Chrome DevTools throttling to verify UX

## Files to Modify

- `src/routes/court/[token]/+page.svelte` - Main changes
- `src/routes/court/[token]/+page.server.ts` - May need to return match data for confirmation
