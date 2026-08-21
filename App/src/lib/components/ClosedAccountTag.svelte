<script lang="ts">
  /**
   * Marks a name whose account has since been closed.
   *
   * Closing an account is a soft delete (see `deleteOwnAccount`): the row stays
   * so a past delivery can still say who sent it or who carried it. That makes
   * the name on an old trip ambiguous without this — it reads as a person who
   * could be contacted, when the phone number is gone and nobody will answer.
   */
  let { compact = false }: { compact?: boolean } = $props();
</script>

<span
  class="inline-flex shrink-0 items-center rounded-full bg-wash px-2 py-0.5 text-xs font-medium text-ink-tertiary"
  title="This account has been closed."
>
  {compact ? 'Closed' : 'Closed account'}
</span>
