import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && ORIGIN=http://localhost:4173 RATE_LIMIT_ENABLED=false npm run preview',
		port: 4173,
		reuseExistingServer: true
	},
	testDir: 'e2e',
	globalSetup: './e2e/global-setup.ts',
	use: {
		launchOptions: {
			executablePath: '/usr/bin/chromium'
		}
	}
});
