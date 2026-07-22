<script lang="ts">
  export let routeLabel = false;
</script>

<div
  class="absolute inset-0 overflow-hidden bg-neutral-100"
  style="background-image: linear-gradient(var(--neutral-200) 1px, transparent 1px), linear-gradient(90deg, var(--neutral-200) 1px, transparent 1px); background-size: 28px 28px;"
>
  <div
    class="font-mono-data absolute left-4 top-4 text-xs tracking-wide text-neutral-400"
  >
    MAP PLACEHOLDER — production wires a real map provider here
  </div>
  {#if routeLabel}
    <div
      class="absolute left-[12%] right-[12%] top-[38%] border-t-[3px] border-dashed border-secondary"
    ></div>
  {/if}
  <slot />
</div>
