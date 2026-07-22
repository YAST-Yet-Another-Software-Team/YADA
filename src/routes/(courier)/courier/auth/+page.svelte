<script lang="ts">
	import { goto } from '$app/navigation';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let phone = '';
	let vehicle = 'bike';

	const vehicleOptions = [
		{ value: 'bike', label: 'Bike' },
		{ value: 'scooter', label: 'Scooter' }
	];

	function continueAuth() {
		goto('/courier/waiting');
	}
</script>

<svelte:head>
	<title>Courier sign in | YADA</title>
</svelte:head>

<div class="flex h-full min-h-[inherit] flex-1 flex-col bg-bg px-6 py-8">
	<div class="flex flex-1 flex-col justify-center gap-8">
		<div>
			<BrandLogo href="/courier/auth" size="md" />
			<p class="mt-3 text-base text-ink-secondary">Sign in to start delivering</p>
		</div>

		<div class="flex flex-col gap-4">
			<Input label="Phone number" type="tel" placeholder="(555) 000-0000" bind:value={phone} />
			<Select label="Vehicle" options={vehicleOptions} bind:value={vehicle} />
			<Button variant="primary" size="lg" fullWidth on:click={continueAuth}>Continue</Button>
		</div>
	</div>
</div>
