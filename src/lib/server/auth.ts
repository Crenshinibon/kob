import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const auth = betterAuth({
  baseURL: env.ORIGIN,
  basePath: '/auth',
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true
  },
  socialProviders: {},
  account: {
    accountLinking: {
      enabled: false
    }
  },
  trustedOrigins: [
    "https://kob.accoma.de",
    "https://kob-theta.vercel.app",
  ],
  plugins: [sveltekitCookies(getRequestEvent)]
});
