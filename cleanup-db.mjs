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

async function cleanup() {
  // Find test user
  const users = await sql`SELECT id, email FROM "user" WHERE email = 'test@example.com'`;
  if (users.length === 0) {
    console.log('Test user not found');
    return;
  }
  
  const userId = users[0].id;
  console.log('Test user ID:', userId);
  
  // Get tournament IDs
  const tournaments = await sql`SELECT id FROM tournament WHERE org_id = ${userId}`;
  console.log('Found', tournaments.length, 'tournaments to delete');
  
  if (tournaments.length === 0) {
    console.log('Nothing to clean up');
    return;
  }
  
  const tourneyIds = tournaments.map(t => t.id);
  
  // Get all rotation IDs for these tournaments
  const rotations = await sql`SELECT id FROM court_rotation WHERE tournament_id = ANY(${tourneyIds})`;
  const rotationIds = rotations.map(r => r.id);
  
  console.log('Deleting', rotationIds.length, 'court rotations and related data...');
  
  if (rotationIds.length > 0) {
    await sql`DELETE FROM match WHERE court_rotation_id = ANY(${rotationIds})`;
    await sql`DELETE FROM court_access WHERE court_rotation_id = ANY(${rotationIds})`;
    await sql`DELETE FROM court_rotation WHERE tournament_id = ANY(${tourneyIds})`;
  }
  
  await sql`DELETE FROM player WHERE tournament_id = ANY(${tourneyIds})`;
  await sql`DELETE FROM tournament WHERE id = ANY(${tourneyIds})`;
  
  console.log('Cleanup complete');
}

cleanup().catch(console.error);
