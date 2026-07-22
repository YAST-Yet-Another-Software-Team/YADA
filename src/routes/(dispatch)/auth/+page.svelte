<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let email = '';
	let password = '';

	function login() {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Log in | YADA Business</title>
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center px-6 py-12">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center lg:mb-10">
			<p class="font-display text-[34px] font-extrabold leading-none text-primary lg:text-5xl">YADA</p>
			<p class="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
				for business
			</p>
		</div>

		<div
			class="flex flex-col gap-4 lg:rounded-lg lg:border lg:border-border lg:bg-surface lg:p-8 lg:shadow-sm"
		>
			<Input label="Work email" type="email" placeholder="name@restaurant.com" bind:value={email} />
			<Input label="Password" type="password" placeholder="••••••••" bind:value={password} />
			<Button variant="primary" size="lg" fullWidth on:click={login}>Log in</Button>
		</div>

		<p class="mt-6 text-center text-xs text-ink-tertiary">
			No payment info needed — YADA only locates and tracks riders.
		</p>
	</div>
</div>
