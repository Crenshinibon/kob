# To Fix

## ToDo

- [] calculateTournamentDuration is duplicated, in tournament/create/+page.svelte and tournament-logic.ts - check for even more duplicated code!
- [] The notion of a tournament-draft is overhead. We create a tournament and that also starts it. We need the option to edit the settings of the current "running" tournament and recalculate the seeding/first courts (but only when no results are entered yet)
- [] tournament/[id]/players not needed
- [] we need a banner (for v1) to show that the data will be wiped
- [] we need a way/script to wipe all tournaments from the database
- [] QR codes in round overview are broken currently
- [] Round overview live query is not working also
- [] Don't use server actions, but RemoteFunctions command or form
- [] Use proper live() query from RemoteFunctions, not polling


## Done
