<script lang="ts">
	let { form } = $props<{ form?: { error?: string } }>();

	let name = $state('');
	let numRounds = $state(3);
</script>

<main>
	<header>
		<a href="/">← Back</a>
		<h1>Create Tournament</h1>
	</header>

	<form method="POST" action="?/create">
		{#if form?.error}
			<div class="error">{form.error}</div>
		{/if}

		<div class="field">
			<label for="name">Tournament Name</label>
			<input
				type="text"
				id="name"
				name="name"
				bind:value={name}
				required
				placeholder="Beach Bash 2024"
			/>
		</div>

		<div class="field">
			<label for="numRounds">Number of Rounds</label>
			<select id="numRounds" name="numRounds" bind:value={numRounds}>
				{#each [1, 2, 3, 4, 5] as n}
					<option value={n}>{n}</option>
				{/each}
			</select>
		</div>

		<button type="submit" class="btn-primary">Create Tournament</button>
	</form>
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	header {
		margin-bottom: 2rem;
	}

	header a {
		color: #666;
		text-decoration: none;
	}

	h1 {
		margin: 0.5rem 0 0 0;
		font-size: 1.5rem;
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
	}

	input,
	select {
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.btn-primary {
		background: #0066cc;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #0052a3;
	}

	.error {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem;
		border-radius: 4px;
	}
</style>
