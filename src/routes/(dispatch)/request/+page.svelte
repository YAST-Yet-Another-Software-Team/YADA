<script lang="ts">
  import { goto } from '$app/navigation';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';

  let pickup = '221 Baker St — YADA Kitchen';
  let dropoff = '';
  let vehicle = 'bike';

  const vehicleOptions = [
    { value: 'bike', label: 'Bike — fastest for nearby drops' },
    { value: 'car', label: 'Car — larger orders' }
  ];

  function findRider() {
    if (!dropoff.trim()) return;
    goto('/matching');
  }
</script>

<svelte:head>
  <title>Request a courier | YADA</title>
</svelte:head>

<div class="relative h-full bg-bg">
  <MapBackdrop />

  <div class="absolute left-4 right-4 top-4 z-10 flex justify-between">
    <IconButton ariaLabel="Menu">
      <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="M4 6h16M4 12h16M4 18h16" /></svg
      >
    </IconButton>
    <IconButton ariaLabel="Notifications">
      <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg
      >
    </IconButton>
  </div>

  <div
    class="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-4 rounded-t-xl bg-surface p-6 shadow-lg"
  >
    <h1 class="text-xl font-semibold text-ink">Request a courier</h1>

    <Input label="Pickup" bind:value={pickup}>
      <svelte:fragment slot="icon">
        <svg viewBox="0 0 24 24" class="h-4 w-4 text-primary" fill="none" stroke="currentColor" stroke-width="2"
          ><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /></svg
        >
      </svelte:fragment>
    </Input>

    <Input label="Dropoff" placeholder="Customer address" bind:value={dropoff}>
      <svelte:fragment slot="icon">
        <svg viewBox="0 0 24 24" class="h-4 w-4 text-secondary" fill="none" stroke="currentColor" stroke-width="2"
          ><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg
        >
      </svelte:fragment>
    </Input>

    <Select label="Vehicle" options={vehicleOptions} bind:value={vehicle} />

    <Button variant="primary" size="lg" fullWidth disabled={!dropoff.trim()} on:click={findRider}>
      Find a rider
    </Button>
  </div>
</div>
