import { db } from './src/lib/server/db/index.js';
import { courtAccess, courtRotation, tournament } from './src/lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

async function check() {
  const tournaments = await db.select().from(tournament).orderBy(desc(tournament.id)).limit(3);
  
  for (const tourney of tournaments) {
    console.log('Tournament:', tourney.id, tourney.name, 'status:', tourney.status, 'currentRound:', tourney.currentRound);
    
    const rotations = await db.select().from(courtRotation).where(eq(courtRotation.tournamentId, tourney.id)).orderBy(courtRotation.roundNumber, courtRotation.courtNumber);
    console.log('  Rotations:', rotations.length);
    
    for (const rotation of rotations) {
      const accesses = await db.select().from(courtAccess).where(eq(courtAccess.courtRotationId, rotation.id));
      console.log(`    Round ${rotation.roundNumber}, Court ${rotation.courtNumber}: ${accesses.length} access records`);
      for (const access of accesses) {
        console.log(`      Token: ${access.token.substring(0, 8)}..., isActive: ${access.isActive} (type: ${typeof access.isActive})`);
      }
    }
  }
}

check().catch(console.error);
