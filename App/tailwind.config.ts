import type { Config } from "tailwindcss";

/**
 * Design System tokens are OKLCH `var()` references, which Tailwind 3 cannot
 * parse into rgb channels. Its `--tw-*-opacity` path therefore bails out and an
 * opacity modifier (`bg-primary/70`) silently emits *no declaration at all*.
 *
 * Wrapping each token in this helper routes the modifier through `color-mix`
 * instead, so `/NN` works on every colour below. Browser support for
 * `color-mix` is the same generation as OKLCH itself, so this adds no new
 * constraint over what the tokens already require.
 */
const withAlpha =
  (token: string) =>
  ({ opacityValue }: { opacityValue?: string }) => {
    // With no modifier Tailwind still passes its own `var(--tw-*-opacity)`
    // placeholder rather than `undefined`, so guard on "is this a real number"
    // instead — otherwise the unmodified case renders `NaN%`.
    const alpha = Number(opacityValue);
    if (opacityValue === undefined || !Number.isFinite(alpha))
      return `var(${token})`;
    return `color-mix(in oklab, var(${token}) ${alpha * 100}%, transparent)`;
  };

/** Expands a Design System ramp (50…950) into a Tailwind colour scale. */
const ramp = (prefix: string) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [
      step,
      withAlpha(`--${prefix}-${step}`),
    ]),
  );

const primaryRamp = ramp("red");
const secondaryRamp = ramp("orange");
const neutralRamp = { 0: withAlpha("--neutral-0"), ...ramp("neutral") };

const config: Config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      // Sizes come from the Design System scale; Tailwind's stock line-height
      // for each step is kept deliberately. The two scales already agree on
      // every step except 4xl (38px vs Tailwind's 36px), so this swaps in the
      // tokens without reflowing existing markup. Where a *pairing* of size and
      // leading matters, use a semantic class (`.text-eyebrow`) or the DS
      // composite tokens (`font: var(--text-heading-md)`) instead.
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "1rem" }],
        sm: ["var(--text-sm)", { lineHeight: "1.25rem" }],
        base: ["var(--text-md)", { lineHeight: "1.5rem" }],
        lg: ["var(--text-lg)", { lineHeight: "1.75rem" }],
        xl: ["var(--text-xl)", { lineHeight: "1.75rem" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "2rem" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "2.25rem" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "2.5rem" }],
        "5xl": ["var(--text-5xl)", { lineHeight: "1" }],
        "6xl": ["var(--text-6xl)", { lineHeight: "1" }],
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        snug: "var(--leading-snug)",
        normal: "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
      },
      fontWeight: {
        regular: "var(--weight-regular)",
        normal: "var(--weight-regular)",
        medium: "var(--weight-medium)",
        semibold: "var(--weight-semibold)",
        bold: "var(--weight-bold)",
        extrabold: "var(--weight-extrabold)",
      },
      letterSpacing: {
        tight: "var(--tracking-tight)",
        normal: "var(--tracking-normal)",
        wide: "var(--tracking-wide)",
        widest: "var(--tracking-widest)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        // Tailwind's stock 2xl (16px) is *smaller* than the token `lg` (18px),
        // which breaks the scale's ordering. Both large steps clamp to the top
        // of the Design System scale so nothing lands off-scale.
        "2xl": "var(--radius-xl)",
        "3xl": "var(--radius-xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        nav: "var(--shadow-nav)",
        "primary-glow": "var(--shadow-primary-glow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        "ds-out": "var(--ease-out)",
        "ds-in": "var(--ease-in)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      borderWidth: {
        sm: "var(--border-width-sm)",
        md: "var(--border-width-md)",
        lg: "var(--border-width-lg)",
      },
      ringColor: {
        focus: withAlpha("--color-focus-ring"),
      },
      outlineColor: {
        focus: withAlpha("--color-focus-ring"),
      },
      outlineWidth: {
        // Matches the `:focus-visible` ring the Design System sets in base.css,
        // for the components that reproduce it on `focus-within`.
        3: "3px",
      },
      colors: {
        bg: withAlpha("--color-bg"),
        overlay: withAlpha("--color-overlay"),
        // App chrome, defined in src/lib/styles/app.css rather than the Design
        // System because they describe this app's shell, not the brand.
        shell: withAlpha("--color-shell"),
        wash: {
          DEFAULT: withAlpha("--color-wash"),
          strong: withAlpha("--color-wash-strong"),
        },
        surface: {
          DEFAULT: withAlpha("--color-surface"),
          raised: withAlpha("--color-surface-raised"),
          sunken: withAlpha("--color-surface-sunken"),
        },
        border: {
          DEFAULT: withAlpha("--color-border"),
          strong: withAlpha("--color-border-strong"),
        },
        ink: {
          DEFAULT: withAlpha("--color-text-primary"),
          secondary: withAlpha("--color-text-secondary"),
          tertiary: withAlpha("--color-text-tertiary"),
          disabled: withAlpha("--color-text-disabled"),
          inverse: withAlpha("--color-text-inverse"),
          link: withAlpha("--color-text-link"),
        },
        primary: {
          DEFAULT: withAlpha("--color-primary"),
          hover: withAlpha("--color-primary-hover"),
          active: withAlpha("--color-primary-active"),
          subtle: withAlpha("--color-primary-subtle"),
          on: withAlpha("--color-on-primary"),
          ...primaryRamp,
        },
        secondary: {
          DEFAULT: withAlpha("--color-secondary"),
          hover: withAlpha("--color-secondary-hover"),
          active: withAlpha("--color-secondary-active"),
          subtle: withAlpha("--color-secondary-subtle"),
          on: withAlpha("--color-on-secondary"),
          ...secondaryRamp,
        },
        neutral: neutralRamp,
        success: {
          DEFAULT: withAlpha("--color-success"),
          subtle: withAlpha("--color-success-subtle"),
        },
        warning: {
          DEFAULT: withAlpha("--color-warning"),
          subtle: withAlpha("--color-warning-subtle"),
        },
        danger: {
          DEFAULT: withAlpha("--color-danger"),
          subtle: withAlpha("--color-danger-subtle"),
        },
        info: {
          DEFAULT: withAlpha("--color-info"),
          subtle: withAlpha("--color-info-subtle"),
        },

        // Tailwind's stock palettes stay reachable by name but resolve to the
        // brand ramps, so a stray `text-red-700` or `bg-gray-100` can no longer
        // put an off-brand colour on screen. Prefer the semantic names above.
        red: primaryRamp,
        orange: secondaryRamp,
        gray: neutralRamp,
        slate: neutralRamp,
        zinc: neutralRamp,
        stone: neutralRamp,
      },
    },
  },
  plugins: [],
};

export default config;
