/**
 * The page-entrance vocabulary, shared by the two public pages (landing and
 * auth) so their choreography stays one system rather than two that drifted.
 *
 * Everything here is client-only by nature: Svelte plays intro transitions on
 * nodes it *creates*, and SvelteKit hydrates rather than mounts, so a page has
 * to flip a `mounted` flag before any of this runs.
 */

import type { Action } from "svelte/action";
import { prefersReducedMotion } from "svelte/motion";

/**
 * Wrap every transition's parameters in this. Someone who has asked for reduced
 * motion still gets the content — instantly, with no travel — and the
 * choreography collapses to a single frame rather than being disabled branch by
 * branch at each call site.
 */
export function motion<T extends Record<string, unknown>>(params: T): T {
  return prefersReducedMotion.current
    ? { ...params, duration: 0, delay: 0 }
    : params;
}

/**
 * How long {@link typewriter} will take for a string at a given speed. Exported
 * so a page can schedule what follows a headline off the end of the typing
 * rather than off a guess.
 */
export function typeDuration(text: string, speed: number) {
  return text.length / (speed * 0.01);
}

/**
 * Types a text node out one character at a time. Adapted from the Svelte
 * tutorial's custom transition: `tick` is what makes it a real transition
 * rather than a timer, so it stays in step with reduced motion and with
 * anything that interrupts it.
 *
 * The node must hold text and nothing else — a `<br>` or a nested element in
 * there would be wiped by the first tick.
 */
export function typewriter(
  node: Element,
  { speed = 1, delay = 0 }: { speed?: number; delay?: number } = {},
) {
  const text = node.textContent ?? "";

  return {
    delay,
    duration: prefersReducedMotion.current ? 0 : typeDuration(text, speed),
    tick: (t: number) => {
      node.textContent = text.slice(0, Math.trunc(text.length * t));
    },
  };
}

/**
 * Fires once, the first time the node is scrolled into view. Sections use it to
 * start their own stagger, so a card never flies in above the fold where nobody
 * saw it happen.
 */
export const inview: Action<HTMLElement, () => void> = (node, onenter) => {
  // No observer (or a headless environment): reveal rather than hide.
  if (typeof IntersectionObserver === "undefined") {
    onenter();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      onenter();
      observer.disconnect();
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  observer.observe(node);
  return { destroy: () => observer.disconnect() };
};
