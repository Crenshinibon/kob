<script lang="ts">
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	function validatePassword(pass: string): string | null {
		if (pass.length < 10) {
			return 'Password must be at least 10 characters';
		}
		return null;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		// Validate password
		const passError = validatePassword(password);
		if (passError) {
			error = passError;
			return;
		}

		// Check passwords match
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		try {
			const response = await fetch('/auth/sign-up/email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, name: email.split('@')[0] })
			});

			if (response.ok) {
				window.location.href = '/';
			} else {
				const data = await response.json();
				error = data.message || 'Signup failed';
			}
		} catch (e) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<main>
	<div class="auth-container">
		<h1>Sign Up</h1>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="field">
				<label for="email">Email</label>
				<input type="email" id="email" bind:value={email} required />
			</div>

			<div class="field">
				<label for="password">Password (min 10 characters)</label>
				<input type="password" id="password" bind:value={password} required minlength="10" />
			</div>

			<div class="field">
				<label for="confirmPassword">Confirm Password</label>
				<input type="password" id="confirmPassword" bind:value={confirmPassword} required />
			</div>

			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'Creating account...' : 'Sign Up'}
			</button>
		</form>

		<p class="switch">
			Already have an account? <a href="/login">Log in</a>
		</p>
	</div>
</main>

<style>
	main {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-xl) var(--spacing-md);
		background-color: var(--bg-primary);
	}

	.auth-container {
		width: 100%;
		max-width: 400px;
		background-color: var(--bg-card);
		padding: var(--spacing-xl);
		border-radius: var(--radius-lg);
		border: 2px solid var(--border-default);
	}

	h1 {
		text-align: center;
		margin-bottom: var(--spacing-xl);
		color: var(--text-primary);
		font-size: var(--font-size-2xl);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	label {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	input {
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: var(--font-size-base);
		background-color: var(--bg-input);
		color: var(--text-input);
		border: var(--border-thickness) solid var(--border-strong);
		border-radius: var(--radius-sm);
		min-height: 48px;
		font-weight: 500;
	}

	.btn-primary {
		background-color: var(--accent-primary);
		color: var(--bg-primary);
		padding: var(--spacing-sm) var(--spacing-md);
		border: 2px solid var(--accent-primary);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		margin-top: var(--spacing-sm);
		transition: all var(--transition-base);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--accent-primary-hover);
		box-shadow: var(--glow-primary);
	}

	.btn-primary:disabled {
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		border-color: var(--border-default);
		cursor: not-allowed;
	}

	.error {
		background-color: rgba(255, 51, 51, 0.1);
		color: var(--accent-error);
		border: 2px solid var(--accent-error);
		padding: var(--spacing-sm);
		border-radius: var(--radius-sm);
		margin-bottom: var(--spacing-md);
		font-weight: 500;
	}

	.switch {
		text-align: center;
		margin-top: var(--spacing-lg);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.switch a {
		color: var(--accent-info);
		font-weight: 600;
	}
</style>
