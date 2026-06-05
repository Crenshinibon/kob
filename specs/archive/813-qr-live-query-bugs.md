# 813 QR Codes and Live Query Bugs

## Issues

### QR Codes Not Loading

- QR codes in round overview are sometimes not loaded fast enough
- QR codes don't update when ready

### Live Query Not Working

- Round overview live query is not updating automatically
- Tournament page should refresh data when rounds advance or scores are entered

## Root Cause

The live query implementation may have issues with:

- Streaming connection dropping
- Cache invalidation not triggering UI updates
- QR code generation happening before data is available

## Files Affected

- `src/routes/tournament/[id]/+page.svelte` - Tournament page with live query
- `src/routes/tournament/[id]/tournament-data.remote.ts` - Live query definition
- `src/routes/tournament/[id]/tournament-actions.remote.ts` - Reconnection logic
