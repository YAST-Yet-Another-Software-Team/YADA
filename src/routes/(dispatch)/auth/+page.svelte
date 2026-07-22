<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';

  let phone = '';

  function continueAuth() {
    goto('/request');
  }
</script>

<svelte:head>
  <title>Sign in | YADA</title>
</svelte:head>

<div class="flex h-full flex-col bg-bg px-6 py-8">
  <div class="flex flex-1 flex-col justify-center gap-8">
    <div>
      <p class="font-display text-[34px] font-extrabold leading-none text-primary">YADA</p>
      <p class="mt-2 text-lg text-ink-secondary">Find a rider to deliver your order.</p>
    </div>

    <div class="flex flex-col gap-4">
      <Input label="Phone number" placeholder="(555) 000-0000" type="tel" bind:value={phone} />
      <Button variant="primary" size="lg" fullWidth on:click={continueAuth}>Continue</Button>
    </div>
  </div>

  <p class="text-center text-xs text-ink-tertiary">
    No payment info needed — YADA only locates and tracks riders.
  </p>
</div>
