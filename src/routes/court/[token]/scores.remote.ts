import { form } from '$app/server';
import { db } from '$lib/server/db';
import { match, courtAccess } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { scoreSchema } from './scoreSchema';



export const saveScore = form(scoreSchema, async (data) => {
  const matchId = parseInt(data.matchId);
  const teamAScore = parseInt(data.teamAScore);
  const teamBScore = parseInt(data.teamBScore);

  // Validate scores
  if (teamAScore < 0 || teamAScore > 50 || teamBScore < 0 || teamBScore > 50) {
    return { error: 'Scores must be between 0 and 50' };
  }

  if (teamAScore === teamBScore) {
    return { error: 'Scores cannot be tied' };
  }

  const maxScore = Math.max(teamAScore, teamBScore);
  const minScore = Math.min(teamAScore, teamBScore);

  if (maxScore < 21) {
    return { error: 'Winner must have at least 21 points' };
  }

  if (maxScore - minScore < 2) {
    return { error: 'Winner must win by at least 2 points' };
  }

  if (maxScore > 21 && maxScore - minScore !== 2) {
    return { error: 'Points difference can only be 2 with >21 points played' }
  }

  // Get match and verify it exists
  const [matchRecord] = await db.select().from(match).where(eq(match.id, matchId));

  if (!matchRecord) {
    return { error: 'Invalid match' };
  }

  // Check if court is still active
  const [access] = await db
    .select()
    .from(courtAccess)
    .where(eq(courtAccess.courtRotationId, matchRecord.courtRotationId));

  if (!access || !access.isActive) {
    return { error: 'Court is not active' };
  }

  // Save score
  await db.update(match).set({ teamAScore, teamBScore }).where(eq(match.id, matchId));

  return { success: true, matchId, teamAScore, teamBScore };
});
