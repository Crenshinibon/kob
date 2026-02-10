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
		padding: 2rem 1rem;
	}

	.auth-container {
		width: 100%;
		max-width: 400px;
	}

	h1 {
		text-align: center;
		margin-bottom: 2rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 500;
		font-size: 0.875rem;
	}

	input {
		padding: 0.75rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.btn-primary {
		background: #0066cc;
		color: white;
		padding: 0.75rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		margin-top: 0.5rem;
	}

	.btn-primary:hover:not(:disabled) {
		background: #0052a3;
	}

	.btn-primary:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.error {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.switch {
		text-align: center;
		margin-top: 1.5rem;
		font-size: 0.875rem;
	}

	.switch a {
		color: #0066cc;
	}
</style>
