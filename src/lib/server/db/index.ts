import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { building } from '$app/environment';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

function createClient() {
	if (env.DATABASE_URL) return neon(env.DATABASE_URL);
	if (building) {
		// SvelteKit analyse imports server modules at build time; env may be unset on preview builds.
		return neon('postgresql://build:build@127.0.0.1:5432/build');
	}
	throw new Error('DATABASE_URL is not set');
}

export const db = drizzle(createClient(), { schema });
