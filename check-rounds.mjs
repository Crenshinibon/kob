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
  const tournaments = await sql`SELECT id, name FROM tournament ORDER BY id DESC LIMIT 1`;
  const tourney = tournaments[0];
  
  const rotations = await sql`SELECT id, round_number, court_number FROM court_rotation WHERE tournament_id = ${tourney.id} ORDER BY round_number, court_number`;
  console.log('Tournament:', tourney.id, tourney.name);
  console.log('Rotations:');
  for (const r of rotations) {
    console.log(`  id=${r.id}, round_number=${r.round_number} (type: ${typeof r.round_number}), court_number=${r.court_number}`);
  }
}

check().catch(console.error);
