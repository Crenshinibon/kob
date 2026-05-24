import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/lib/server/db/schema';

if (!Bun.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = neon(Bun.env.DATABASE_URL);

export const db = drizzle(client, { schema });
