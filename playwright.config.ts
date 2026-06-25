import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		// Use vite directly so E2E does not require db:push on every run; Bun is the package manager.
		command:
			'export PATH="$HOME/.bun/bin:$PATH" && bunx vite build && ORIGIN=http://localhost:4173 bunx vite preview',
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
