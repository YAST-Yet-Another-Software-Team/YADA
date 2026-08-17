<script lang="ts">
  import IconStar from '~icons/mdi/star';

  /**
   * A cached average and its weight, inline: "4.8 ★ 12".
   *
   * The count is never dropped. An average without one is a claim the reader
   * can't size — a lone 5.0 and two hundred of them look identical, and the
   * matching rubric already refuses to treat them the same (see `data/matching`).
   *
   * Distinct from `RatingStars`, which is five tappable glyphs for giving or
   * showing *one* verdict. This is the aggregate of many, and has to fit beside
   * a name on a crowded offer card.
   */
  let {
    average,
    count,
    /**
     * What to render before anyone has rated. Defaults to nothing: on an offer
     * card the absence of a score is quieter and more honest than a label, and
     * the screens where "unrated" is itself the news pass their own text.
     */
    emptyLabel = null
  }: {
    average: number | null;
    count: number;
    emptyLabel?: string | null;
  } = $props();
</script>

{#if average != null}
  <span
    class="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-secondary"
    aria-label="{average.toFixed(1)} out of 5, from {count} {count === 1 ? 'rating' : 'ratings'}"
  >
    <IconStar class="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
    <span class="font-mono-data">{average.toFixed(1)}</span>
    <span class="font-mono-data font-medium text-ink-tertiary">({count})</span>
  </span>
{:else if emptyLabel}
  <span class="shrink-0 text-sm text-ink-tertiary">{emptyLabel}</span>
{/if}
