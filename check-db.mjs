import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Parse .env file
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const sql = neon(envVars.DATABASE_URL);

async function check() {
  // Get latest tournament
  const tournaments = await sql`SELECT id, name, status, current_round FROM tournament ORDER BY id DESC LIMIT 3`;
  console.log('Tournaments:', JSON.stringify(tournaments, null, 2));
  
  for (const tourney of tournaments) {
    const rotations = await sql`SELECT id, round_number, court_number FROM court_rotation WHERE tournament_id = ${tourney.id} ORDER BY round_number, court_number`;
    console.log(`\nTournament ${tourney.id} (${tourney.name}) rotations:`, rotations.length);
    
    for (const rotation of rotations) {
      const accesses = await sql`SELECT id, token, is_active FROM court_access WHERE court_rotation_id = ${rotation.id}`;
      console.log(`  Round ${rotation.round_number}, Court ${rotation.court_number}: ${accesses.length} access records`);
      for (const access of accesses) {
        console.log(`    Token: ${access.token.substring(0, 8)}..., is_active: ${access.is_active} (type: ${typeof access.is_active})`);
      }
    }
  }
}

check().catch(console.error);
