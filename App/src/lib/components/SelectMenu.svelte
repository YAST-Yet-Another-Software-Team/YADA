<script lang="ts">
  /**
   * A select whose menu is ours.
   *
   * `Select` wraps a native `<select>`, which is the right call for a form
   * field: it gets the platform's picker, which on a phone is a far better
   * control than anything we'd build. But the popup a native select opens is
   * drawn by the browser and cannot be styled — no border radius, no hover
   * colour, no check mark, no matching type. Where the control is a filter
   * sitting in the middle of our own chrome, that popup looks like it belongs
   * to a different application, which is exactly what it is.
   *
   * So this one is a button and a listbox: same keyboard contract as a select
   * (arrows to move, Enter to choose, Escape to close, Home/End to jump), same
   * ARIA roles, and a menu that reads like the rest of the app.
   */
  import { onDestroy, onMount, tick } from 'svelte';
  import IconChevronDown from '~icons/mdi/chevron-down';
  import IconCheck from '~icons/mdi/check-bold';

  type Option = { value: string; label: string };

  let {
    value = $bindable(''),
    options = [],
    /** Prefix shown on the trigger, e.g. `Status: Delivered`. */
    label = '',
    ariaLabel = 'Select an option',
    id = `select-menu-${Math.random().toString(36).slice(2, 9)}`
  }: {
    value?: string;
    options?: Option[];
    label?: string;
    ariaLabel?: string;
    id?: string;
  } = $props();

  let open = $state(false);
  let highlighted = $state(-1);
  let root = $state<HTMLDivElement | null>(null);
  let listRef = $state<HTMLUListElement | null>(null);

  /**
   * Viewport coordinates for the menu, because it is positioned `fixed` rather
   * than `absolute`.
   *
   * An absolutely-positioned menu is only ever above what its *own* stacking
   * context contains, and any ancestor with a transform, a filter, or an
   * opacity below 1 silently becomes that context — at which point `z-50` is
   * competing inside a box the rest of the page paints over, and no z-index
   * can win. The page entrance animations are exactly such an ancestor, and
   * they will not be the last one.
   *
   * `fixed` takes the menu out of that argument entirely: it is positioned
   * against the viewport and only has to beat the things it is genuinely
   * layered against. The cost is that it no longer follows the trigger for
   * free, which is what `place()` and the scroll listeners below pay.
   */
  let position = $state<{ top: number; right: number; minWidth: number } | null>(null);

  const selectedIndex = $derived(options.findIndex((option) => option.value === value));
  const selectedLabel = $derived(options[selectedIndex]?.label ?? '');

  /** Gap between trigger and menu, matching the `mt-1` this used to have. */
  const OFFSET = 4;

  function place() {
    const trigger = root?.querySelector('button');
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = listRef?.offsetHeight ?? 0;
    const below = window.innerHeight - rect.bottom - OFFSET;

    // Flip above only when there is genuinely more room there — a menu that
    // opens upward into an even smaller gap is worse than one that is clipped.
    const flip = menuHeight > below && rect.top - OFFSET > below;

    position = {
      top: flip ? Math.max(OFFSET, rect.top - OFFSET - menuHeight) : rect.bottom + OFFSET,
      // Right-aligned to the trigger, as the absolute version was.
      right: Math.max(0, window.innerWidth - rect.right),
      minWidth: rect.width
    };
  }

  async function openMenu() {
    open = true;
    // Start on the current choice, so the first arrow press moves from where
    // the user already is rather than from the top of the list.
    highlighted = selectedIndex >= 0 ? selectedIndex : 0;
    await tick();
    // Twice: the first pass gives the menu a height, the second uses it to
    // decide whether it still fits below.
    place();
    await tick();
    place();
    listRef?.focus();
  }

  function closeMenu(returnFocus = true) {
    if (!open) return;
    open = false;
    highlighted = -1;
    position = null;
    if (returnFocus) root?.querySelector('button')?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    value = option.value;
    closeMenu();
  }

  function handleTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void openMenu();
    }
  }

  function handleListKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        highlighted = (highlighted + 1) % options.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        highlighted = (highlighted - 1 + options.length) % options.length;
        break;
      case 'Home':
        event.preventDefault();
        highlighted = 0;
        break;
      case 'End':
        event.preventDefault();
        highlighted = options.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(highlighted);
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu();
        break;
      case 'Tab':
        closeMenu(false);
        break;
    }
  }

  function handleDocumentPointerDown(event: MouseEvent) {
    if (!open) return;
    if (!root?.contains(event.target as Node)) closeMenu(false);
  }

  /**
   * A fixed menu does not travel with its trigger, so anything that moves the
   * trigger has to move the menu. Capture-phase, because the scroller is
   * usually an ancestor element rather than the window and a bubbling `scroll`
   * listener on `document` would never hear it.
   */
  function reposition() {
    if (open) place();
  }

  onMount(() => {
    document.addEventListener('mousedown', handleDocumentPointerDown);
    document.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
      document.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
    }
  });
</script>

<div class="relative" bind:this={root}>
  <button
    {id}
    type="button"
    class="inline-flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink-tertiary focus-visible:border-primary focus-visible:outline focus-visible:outline-3 focus-visible:outline-focus"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={ariaLabel}
    onclick={() => (open ? closeMenu() : openMenu())}
    onkeydown={handleTriggerKeydown}
  >
    <span class="truncate">
      {#if label}<span class="text-ink-secondary">{label}:</span>{/if}
      {selectedLabel}
    </span>
    <IconChevronDown
      class="h-4 w-4 shrink-0 text-ink-tertiary transition-transform duration-200 {open
        ? 'rotate-180'
        : ''}"
      aria-hidden="true"
    />
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <ul
      bind:this={listRef}
      class="fixed z-50 max-h-[min(18rem,60svh)] overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg outline-none"
      style={position
        ? `top:${position.top}px;right:${position.right}px;min-width:${position.minWidth}px`
        : // Measured before it is shown: laid out so `offsetHeight` is real,
          // but invisible and inert so the first frame isn't a flash of a menu
          // in the top-left corner.
          'top:0;left:0;visibility:hidden;pointer-events:none'}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={highlighted >= 0 ? `${id}-option-${highlighted}` : undefined}
      tabindex="-1"
      onkeydown={handleListKeydown}
    >
      {#each options as option, index (option.value)}
        {@const isSelected = option.value === value}
        <!-- The listbox owns the keyboard, per the `aria-activedescendant`
             pattern: focus stays on the <ul> and the options are pointer
             targets, so a key handler here would be a second, conflicting one. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id="{id}-option-{index}"
          role="option"
          aria-selected={isSelected}
          class="flex cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-sm transition-colors {index ===
          highlighted
            ? 'bg-primary-subtle'
            : ''} {isSelected ? 'font-semibold text-primary' : 'text-ink'}"
          onmouseenter={() => (highlighted = index)}
          onclick={() => choose(index)}
        >
          <IconCheck
            class="h-4 w-4 shrink-0 {isSelected ? 'opacity-100' : 'opacity-0'}"
            aria-hidden="true"
          />
          {option.label}
        </li>
      {/each}
    </ul>
  {/if}
</div>
