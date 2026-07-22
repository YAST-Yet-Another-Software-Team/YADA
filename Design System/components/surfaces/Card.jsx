import React from "react";

export function Card({ children, padding = "var(--space-6)", elevated = false }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: elevated ? "var(--shadow-md)" : "var(--shadow-sm)",
        padding,
        fontFamily: "var(--font-body)",
      }}
    >
      {children}
    </div>
  );
}
