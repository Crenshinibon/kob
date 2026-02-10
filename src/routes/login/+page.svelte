<script lang="ts">
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const response = await fetch('/auth/sign-in/email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if (response.ok) {
				window.location.href = '/';
			} else {
				const data = await response.json();
				error = data.message || 'Login failed';
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
		<h1>Log In</h1>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="field">
				<label for="email">Email</label>
				<input type="email" id="email" bind:value={email} required />
			</div>

			<div class="field">
				<label for="password">Password</label>
				<input type="password" id="password" bind:value={password} required />
			</div>

			<button type="submit" class="btn-primary" disabled={loading}>
				{loading ? 'Logging in...' : 'Log In'}
			</button>
		</form>

		<p class="switch">
			Don't have an account? <a href="/signup">Sign up</a>
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
