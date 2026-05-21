import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/lib/server/db/schema';

const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error('DATABASE_URL is not set');

const client = neon(url);
export const db = drizzle(client, { schema });
