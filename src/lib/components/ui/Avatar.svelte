<script lang="ts">
  export let initials = '??';
  export let size = 48;
  export let status: 'online' | 'offline' | null = null;
</script>

<div class="relative shrink-0" style="width:{size}px;height:{size}px">
  <div
    class="flex h-full w-full items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary"
  >
    {initials}
  </div>
  {#if status === 'online'}
    <span
      class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success"
    ></span>
  {/if}
</div>
