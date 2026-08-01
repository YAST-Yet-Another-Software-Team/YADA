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

  const selectedIndex = $derived(options.findIndex((option) => option.value === value));
  const selectedLabel = $derived(options[selectedIndex]?.label ?? '');

  async function openMenu() {
    open = true;
    // Start on the current choice, so the first arrow press moves from where
    // the user already is rather than from the top of the list.
    highlighted = selectedIndex >= 0 ? selectedIndex : 0;
    await tick();
    listRef?.focus();
  }

  function closeMenu(returnFocus = true) {
    if (!open) return;
    open = false;
    highlighted = -1;
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

  onMount(() => {
    document.addEventListener('mousedown', handleDocumentPointerDown);
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
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
    <svg
      viewBox="0 0 24 24"
      class="h-4 w-4 shrink-0 text-ink-tertiary transition-transform duration-200 {open
        ? 'rotate-180'
        : ''}"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <ul
      bind:this={listRef}
      class="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg outline-none"
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
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 shrink-0 {isSelected ? 'opacity-100' : 'opacity-0'}"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {option.label}
        </li>
      {/each}
    </ul>
  {/if}
</div>
