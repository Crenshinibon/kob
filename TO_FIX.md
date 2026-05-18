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
- [] Use proper live() query from RemoteFunctions (https://svelte.dev/docs/kit/remote-functions#query.live) with server-side polling or realtime queries from db
- [] closeRound errors hard:
  [500] POST /tournament/292
  Error: requested(...) can only be called in the context of a command/form remote function
  at requested (node_modules/@sveltejs/kit/src/runtime/app/server/remote/requested.js?v=4f175350:127:9)
  at closeRound (src/routes/tournament/[id]/+page.server.ts:389:11)
- [] Standings after round 1 in random seed are wrong. The players should be ranked by their current round court position and the reason why the earned the spot, court rank and then points from first round. Also never rank on points first. It's always court position first.

## Done
