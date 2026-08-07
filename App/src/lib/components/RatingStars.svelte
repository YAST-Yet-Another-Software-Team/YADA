<script lang="ts">
  import IconStar from '~icons/mdi/star';
  import IconStarOutline from '~icons/mdi/star-outline';

  /**
   * Five stars, either as an input or as a fact.
   *
   * One component for both because the two must look identical: the stars a
   * business taps today are the stars it sees read-only tomorrow, and two
   * implementations of a five-pointed shape will drift apart in exactly the
   * ways nobody reviews. `readonly` is the whole difference — buttons with a
   * radiogroup contract on one side, presentational spans on the other.
   */

  let {
    value = $bindable(0),
    readonly = false,
    size = 28,
    label = 'Rate this delivery',
  }: {
    /** Whole stars, 0 (nothing chosen yet) to 5. */
    value?: number;
    readonly?: boolean;
    size?: number;
    label?: string;
  } = $props();

  /** The star under the pointer previews a choice without committing it. */
  let hovered = $state(0);

  const shown = $derived(readonly ? value : hovered || value);
  const stars = [1, 2, 3, 4, 5];
</script>

{#if readonly}
  <span
    class="inline-flex items-center gap-0.5"
    role="img"
    aria-label={`Rated ${value} out of 5`}
  >
    {#each stars as star (star)}
      {#if star <= shown}
        <IconStar width={size} height={size} class="text-warning" aria-hidden="true" />
      {:else}
        <IconStarOutline width={size} height={size} class="text-border-strong" aria-hidden="true" />
      {/if}
    {/each}
  </span>
{:else}
  <!-- A group role, not `radiogroup`: the stars are real buttons that take the
       tab stop themselves, so the container claiming focus would double it. -->
  <div
    class="inline-flex items-center gap-1"
    role="group"
    aria-label={label}
    onmouseleave={() => (hovered = 0)}
  >
    {#each stars as star (star)}
      <button
        type="button"
        aria-pressed={value === star}
        aria-label={`${star} star${star === 1 ? "" : "s"}`}
        class="rounded-sm transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-3 focus-visible:outline-focus"
        onmouseenter={() => (hovered = star)}
        onfocus={() => (hovered = star)}
        onclick={() => (value = star)}
      >
        {#if star <= shown}
          <IconStar width={size} height={size} class="text-warning" aria-hidden="true" />
        {:else}
          <IconStarOutline width={size} height={size} class="text-border-strong" aria-hidden="true" />
        {/if}
      </button>
    {/each}
  </div>
{/if}
