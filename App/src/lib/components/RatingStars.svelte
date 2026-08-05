<script lang="ts">
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
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        class={star <= shown ? "text-warning" : "text-neutral-300"}
        fill={star <= shown ? "currentColor" : "none"}
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.5z"
        />
      </svg>
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
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          class={star <= shown ? "text-warning" : "text-neutral-300"}
          fill={star <= shown ? "currentColor" : "none"}
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.5z"
          />
        </svg>
      </button>
    {/each}
  </div>
{/if}
