import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && ORIGIN=http://localhost:4173 npm run preview',
		port: 4173
	},
	testDir: 'e2e'
});
