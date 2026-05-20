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
  const tournaments = await sql`SELECT id, name, status, current_round, physical_court_count, player_count FROM tournament ORDER BY id DESC LIMIT 1`;
  console.log('Latest tournament:', JSON.stringify(tournaments[0], null, 2));
}

check().catch(console.error);
