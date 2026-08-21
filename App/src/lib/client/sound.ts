/**
 * The alert bell.
 *
 * Synthesised rather than played from a file. A bell is two decaying sine
 * partials, which is a few lines of Web Audio — cheaper than a binary in the
 * repo, with nothing to fetch, nothing to decode before the first ring, and a
 * pitch and decay anyone can tune in a diff. It also matches how the rest of the
 * app treats assets: icons compile into the bundle rather than loading from a
 * CDN.
 */

/** Fundamental, then a partial a fifth above — the interval that reads "bell". */
const PARTIALS = [
  { hz: 880, gain: 0.5 },
  { hz: 1320, gain: 0.18 },
] as const;

const DECAY_SECONDS = 1.4;

/**
 * Two events landing in the same poll must not double-strike. Shorter than the
 * decay, so a genuine second alert a moment later still sounds.
 */
const MIN_GAP_MS = 900;

let context: AudioContext | null = null;
let lastPlayedAt = 0;

/**
 * Bring the audio context up, from inside a user gesture.
 *
 * Browsers refuse to play anything until the person has interacted with the
 * page, and a context created outside a gesture starts `suspended` and stays
 * that way. So this is called from a real event handler — a tap anywhere, or a
 * rider going online — and never at import, which would also break SSR.
 */
export function unlockAudio() {
  if (typeof window === "undefined") return;

  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  } catch {
    // No Web Audio, or the browser refused. Silence is an acceptable outcome —
    // every alert this backs is also visible on screen.
  }
}

/**
 * Ring once. A no-op until `unlockAudio` has run, which is the browser's rule
 * rather than ours.
 *
 * Deliberately not gated on `document.hidden`: a backgrounded tab is exactly
 * when someone most needs to be told, and the whole point is to reach a rider
 * who is looking at something else.
 */
export function playBell() {
  if (!context || context.state !== "running") return;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;

  try {
    const startedAt = context.currentTime;

    for (const partial of PARTIALS) {
      const oscillator = context.createOscillator();
      const amplitude = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = partial.hz;

      // An exponential fall, not linear: loudness is perceived logarithmically,
      // so a linear ramp sounds like it stops rather than rings out. It cannot
      // reach zero, hence the small floor.
      amplitude.gain.setValueAtTime(partial.gain, startedAt);
      amplitude.gain.exponentialRampToValueAtTime(
        0.0001,
        startedAt + DECAY_SECONDS,
      );

      oscillator.connect(amplitude).connect(context.destination);
      oscillator.start(startedAt);
      oscillator.stop(startedAt + DECAY_SECONDS);
    }
  } catch {
    // A failed alert must never take a screen down with it.
  }
}
