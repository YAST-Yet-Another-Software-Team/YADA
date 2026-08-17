<script module lang="ts">
  /** Letters and digits — the characters a person means to type. */
  const SIGNIFICANT = /[0-9A-Za-z]/;

  function significantCount(text: string) {
    return (text.match(/[0-9A-Za-z]/g) ?? []).length;
  }

  /**
   * Where the caret belongs once the value has been reformatted.
   *
   * Counted from the *end*, not the start: a formatter is free to add
   * characters in front of what was typed — `0` becoming `+233 ` is exactly
   * that — and a count taken from the left would be thrown off by every one of
   * them. What has to survive is how much of the value still lies ahead of the
   * caret, which separators and prefixes cannot disturb.
   */
  function caretForTail(text: string, tail: number) {
    let seen = 0;

    for (let index = text.length; index > 0; index--) {
      if (seen === tail) return index;
      if (SIGNIFICANT.test(text[index - 1])) seen++;
    }

    return 0;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    label = '',
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    disabled = false,
    id = undefined,
    inputRef = $bindable(null),
    autocomplete = undefined,
    icon,
    format,
    oninput,
    ...rest
  }: {
    label?: string;
    value?: string;
    placeholder?: string;
    type?: 'text' | 'tel' | 'email' | 'password';
    disabled?: boolean;
    id?: string;
    inputRef?: HTMLInputElement | null;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    icon?: Snippet;
    /**
     * Reshape the field's contents on every keystroke — a phone number's
     * grouping, a plate's hyphen. Given whatever is in the field, it returns
     * what should be there instead; the caret is this component's problem, not
     * the caller's, which is the reason this is a prop rather than an `oninput`
     * each screen writes for itself.
     */
    format?: (raw: string) => string;
  } & HTMLInputAttributes = $props();

  /**
   * The id the label points at.
   *
   * `$props.id()` rather than the random string this used to default to: that
   * one was drawn once on the server and again in the browser, so every field
   * shipped a `<label for>` aimed at an id that no longer existed after
   * hydration. This one is derived from the component's place in the tree and
   * is the same on both sides.
   */
  const generatedId = $props.id();
  const fieldId = $derived(id ?? generatedId);

  function reformat(element: HTMLInputElement, raw: string, caret: number) {
    if (!format) return;

    const tail = significantCount(raw.slice(caret));
    const next = format(raw);

    element.value = next;
    value = next;

    const position = caretForTail(next, tail);
    element.setSelectionRange(position, position);
  }

  function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
    const element = event.currentTarget;

    reformat(element, element.value, element.selectionStart ?? element.value.length);
    oninput?.(event as Parameters<NonNullable<HTMLInputAttributes['oninput']>>[0]);
  }

  /**
   * Backspace onto a separator moves past it instead of deleting it.
   *
   * Deleting the space or the hyphen on its own does nothing a person can see —
   * `format` puts it straight back — so the key would appear dead and the caret
   * would sit still. Stepping over it means the next press deletes a character
   * that is really there, which is what was being aimed at.
   */
  function handleBeforeInput(event: InputEvent & { currentTarget: HTMLInputElement }) {
    if (!format || event.inputType !== 'deleteContentBackward') return;

    const element = event.currentTarget;
    const start = element.selectionStart;

    if (start == null || start === 0 || start !== element.selectionEnd) return;
    if (SIGNIFICANT.test(element.value[start - 1])) return;

    event.preventDefault();
    element.setSelectionRange(start - 1, start - 1);
  }
</script>

<label class="flex w-full flex-col gap-1.5" for={fieldId}>
  {#if label}
    <span class="text-sm font-semibold text-ink">{label}</span>
  {/if}
  <div
    class="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 transition focus-within:border-md focus-within:border-primary focus-within:outline focus-within:outline-3 focus-within:outline-focus"
  >
    {#if icon}
      <span class="shrink-0 text-ink-tertiary">{@render icon()}</span>
    {/if}
    <input
      id={fieldId}
      {type}
      {placeholder}
      {disabled}
      {autocomplete}
      bind:this={inputRef}
      bind:value
      {...rest}
      oninput={handleInput}
      onbeforeinput={handleBeforeInput}
      class="w-full border-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-disabled"
    />
  </div>
</label>
