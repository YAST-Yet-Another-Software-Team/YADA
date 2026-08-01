<script lang="ts">
  let {
    initials = '??',
    size = 48,
    status = null,
    src = null,
    alt = ''
  }: {
    initials?: string;
    size?: number;
    status?: 'online' | 'offline' | null;
    /** A profile photo, if there is one. Initials are the fallback, not the default. */
    src?: string | null;
    alt?: string;
  } = $props();
</script>

<div class="relative shrink-0" style="width:{size}px;height:{size}px">
  {#if src}
    <img {src} {alt} class="h-full w-full rounded-full object-cover" />
  {:else}
    <div
      class="flex h-full w-full items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary"
    >
      {initials}
    </div>
  {/if}
  {#if status === 'online'}
    <span
      class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-success"
    ></span>
  {/if}
</div>
