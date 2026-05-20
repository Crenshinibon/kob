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

async function test() {
  // Get latest tournament
  const [tourney] = await sql`SELECT id, physical_court_count FROM tournament ORDER BY id DESC LIMIT 1`;
  console.log('Tournament:', tourney.id, 'physical_court_count:', tourney.physical_court_count);
  
  // Get Round 2 rotations
  const rotations = await sql`SELECT id, court_number FROM court_rotation WHERE tournament_id = ${tourney.id} AND round_number = 2 ORDER BY court_number`;
  console.log('Round 2 rotations:', rotations.length);
  
  // Activate first physical_court_count courts
  const activeCount = Math.min(tourney.physical_court_count, rotations.length);
  console.log('Activating', activeCount, 'courts');
  
  for (let i = 0; i < activeCount; i++) {
    const rotation = rotations[i];
    console.log('Activating court', rotation.court_number, 'rotation ID:', rotation.id);
    
    const result = await sql`UPDATE court_access SET is_active = true WHERE court_rotation_id = ${rotation.id}`;
    console.log('Updated:', result);
  }
  
  // Verify
  const accesses = await sql`SELECT ca.id, ca.court_rotation_id, ca.is_active, cr.court_number 
    FROM court_access ca 
    JOIN court_rotation cr ON ca.court_rotation_id = cr.id 
    WHERE cr.tournament_id = ${tourney.id} AND cr.round_number = 2 
    ORDER BY cr.court_number`;
  
  console.log('Round 2 accesses after activation:');
  for (const access of accesses) {
    console.log(`  Court ${access.court_number}: is_active = ${access.is_active}`);
  }
}

test().catch(console.error);
