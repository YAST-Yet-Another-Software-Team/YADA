import React from "react";

export function Switch({ checked, onChange, disabled = false, ariaLabel }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: 44,
        height: 26,
        borderRadius: "var(--radius-full)",
        border: "none",
        background: checked ? "var(--color-primary)" : "var(--neutral-300)",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--duration-fast) var(--ease-standard)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "var(--radius-full)",
          background: "var(--neutral-0)",
          boxShadow: "var(--shadow-xs)",
          transition: "left var(--duration-fast) var(--ease-standard)",
        }}
      />
    </button>
  );
}
