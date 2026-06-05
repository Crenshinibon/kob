<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';

	function handleBack() {
		goto('/');
	}
</script>

<svelte:head>
	<title>{m.privacy_title()} - KoB Tracker</title>
</svelte:head>

<div class="privacy-page">
	<button type="button" onclick={handleBack} class="back-btn">&larr; {m.back()}</button>

	<h1>{m.privacy_title()}</h1>

	<section>
		<h2>{m.privacy_cookies_heading()}</h2>
		<p>{m.privacy_cookies_desc()}</p>

		<h3>{m.privacy_cookies_table_heading()}</h3>
		<table class="cookie-table">
			<thead>
				<tr>
					<th>{m.privacy_cookies_table_name()}</th>
					<th>{m.privacy_cookies_table_purpose()}</th>
					<th>{m.privacy_cookies_table_duration()}</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>{m.privacy_cookies_session()}</td>
					<td>{m.privacy_cookies_session_desc()}</td>
					<td>{m.privacy_cookies_session_dur()}</td>
				</tr>
				<tr>
					<td>{m.privacy_cookies_csrf()}</td>
					<td>{m.privacy_cookies_csrf_desc()}</td>
					<td>{m.privacy_cookies_csrf_dur()}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<section>
		<h2>{m.privacy_rights_heading()}</h2>
		<p>{m.privacy_rights_desc()}</p>
	</section>

	<section>
		<h2>{m.privacy_storage_heading()}</h2>
		<p>{m.privacy_storage_desc()}</p>
	</section>

	<section>
		<h2>{m.privacy_questions_heading()}</h2>
		<p>{m.privacy_questions_desc()}</p>
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
