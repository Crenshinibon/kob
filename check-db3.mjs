import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

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
  const tournaments = await sql`SELECT id, name, status, current_round, physical_court_count FROM tournament ORDER BY id DESC LIMIT 1`;
  const tourney = tournaments[0];
  console.log('Tournament:', tourney.id, tourney.name, 'physical_court_count:', tourney.physical_court_count);
  
  const rotations = await sql`SELECT id, round_number, court_number FROM court_rotation WHERE tournament_id = ${tourney.id} ORDER BY round_number, court_number`;
  console.log('Rotations:', rotations.length);
  
  for (const rotation of rotations) {
    const accesses = await sql`SELECT id, token, is_active FROM court_access WHERE court_rotation_id = ${rotation.id}`;
    console.log(`  Round ${rotation.round_number}, Court ${rotation.court_number}: is_active = ${accesses[0]?.is_active}`);
  }
}

check().catch(console.error);
