<script lang="ts">
	let {
		id,
		name = undefined,
		value = $bindable(),
		min,
		max,
		step = 1,
		disabled = false,
		testId = undefined,
		currentLabel = undefined,
		formatCurrent = undefined,
		oninput = undefined,
		onchange = undefined
	}: {
		id: string;
		name?: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		disabled?: boolean;
		testId?: string;
		currentLabel?: string;
		formatCurrent?: (value: number) => string;
		oninput?: (value: number) => void;
		onchange?: (value: number) => void;
	} = $props();

	const currentDisplay = $derived(
		formatCurrent ? formatCurrent(value) : (currentLabel ?? String(value))
	);
	const currentTestId = $derived(testId ? `${testId}-value` : 'range-current');

	function readValue(e: Event): number {
		return Number((e.currentTarget as HTMLInputElement).value);
	}
</script>

<div class="range-container">
	<span class="range-current" data-testid={currentTestId}>{currentDisplay}</span>
	<input
		type="range"
		{id}
		{name}
		{min}
		{max}
		{step}
		{disabled}
		data-testid={testId}
		bind:value
		oninput={(e) => oninput?.(readValue(e))}
		onchange={(e) => onchange?.(readValue(e))}
	/>
	<div class="range-labels">
		<span>{min}</span>
		<span>{max}</span>
	</div>
</div>

<style>
	.range-container {
		display: grid;
		grid-template-columns: 1fr;
	}

	.range-current {
		display: block;
		text-align: center;
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--text-primary);
	}

	.range-container input[type='range'] {
		width: 100%;
		accent-color: var(--accent-primary);
		margin: var(--spacing-sm) 0;
	}

	.range-container input[type='range']:disabled {
		opacity: 0.45;
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}
</style>
