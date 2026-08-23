import React from "react";

const tones = {
  neutral: { bg: "var(--neutral-100)", fg: "var(--neutral-700)" },
  primary: { bg: "var(--color-primary-subtle)", fg: "var(--color-primary)" },
  success: { bg: "var(--color-success-subtle)", fg: "var(--green-600)" },
  warning: { bg: "var(--color-warning-subtle)", fg: "var(--amber-600)" },
  danger:  { bg: "var(--color-danger-subtle)", fg: "var(--red-700)" },
};

export function Badge({ children, tone = "neutral" }) {
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        background: t.bg,
        color: t.fg,
        font: "var(--text-eyebrow)",
        letterSpacing: "var(--tracking-wide)",
        textTransform: "uppercase",
        fontFamily: "var(--font-body)",
      }}
    >
      {children}
    </span>
  );
}
