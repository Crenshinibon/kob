import * as v from 'valibot'

export const scoreSchema = v.object({
  matchId: v.pipe(v.string(), v.nonEmpty()),
  teamAScore: v.pipe(v.string(), v.nonEmpty()),
  teamBScore: v.pipe(v.string(), v.nonEmpty())
});

