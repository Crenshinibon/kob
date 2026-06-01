<script lang="ts">
	import { goto } from '$app/navigation';

	function handleBack() {
		goto('/');
	}
</script>

<svelte:head>
	<title>Privacy & Cookies - KoB Tracker</title>
</svelte:head>

<div class="privacy-page">
	<button type="button" onclick={handleBack} class="back-btn">&larr; Back</button>

	<h1>Privacy & Cookies</h1>

	<section>
		<h2>Essential Cookies</h2>
		<p>
			This website uses essential cookies that are necessary for authentication and security. These
			cookies are required for the website to function properly and cannot be disabled.
		</p>

		<h3>What cookies do we use?</h3>
		<table class="cookie-table">
			<thead>
				<tr>
					<th>Cookie Name</th>
					<th>Purpose</th>
					<th>Duration</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Session cookies</td>
					<td>Keep you signed in during your visit</td>
					<td>Session (deleted when browser closes)</td>
				</tr>
				<tr>
					<td>CSRF token</td>
					<td>Protects against cross-site request forgery attacks</td>
					<td>Session</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section>
		<h2>Your Rights</h2>
		<p>
			Under GDPR, you have the right to access, correct, or delete your personal data. Contact us if
			you have any questions about how we handle your data.
		</p>
	</section>

	<section>
		<h2>Data Storage</h2>
		<p>
			Your account information (email address) is stored securely in our database. We do not share
			your data with third parties.
		</p>
	</section>

	<section>
		<h2>Questions?</h2>
		<p>If you have questions about this policy, please contact the tournament organizer.</p>
	</section>
</div>

<style>
	.privacy-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.back-btn {
		background: transparent;
		color: var(--accent-info);
		border: none;
		padding: 0.5rem 0;
		font-size: var(--font-size-base);
		cursor: pointer;
		margin-bottom: 1rem;
	}

	.back-btn:hover {
		color: var(--text-primary);
	}

	h1 {
		margin-bottom: 1.5rem;
		color: var(--text-primary);
	}

	h2 {
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--text-primary);
		border-bottom: 2px solid var(--border-default);
		padding-bottom: 0.5rem;
	}

	h3 {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		color: var(--text-secondary);
	}

	p {
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.cookie-table {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
		background: var(--bg-secondary);
		border: 2px solid var(--border-default);
	}

	.cookie-table th,
	.cookie-table td {
		padding: 0.75rem;
		text-align: left;
		border: 1px solid var(--border-default);
	}

	.cookie-table th {
		background: var(--bg-card);
		color: var(--text-primary);
		font-weight: 600;
	}

	.cookie-table td {
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	section {
		margin-bottom: 1.5rem;
	}
</style>
