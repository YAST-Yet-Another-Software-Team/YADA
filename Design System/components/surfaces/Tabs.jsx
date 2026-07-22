import React from "react";

export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "4px", background: "var(--neutral-100)", padding: "4px", borderRadius: "var(--radius-md)", fontFamily: "var(--font-body)" }}>
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <button
            key={t.value}
            onClick={() => onChange && onChange(t.value)}
            style={{
              flex: 1,
              border: "none",
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              background: isActive ? "var(--color-surface)" : "transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
              boxShadow: isActive ? "var(--shadow-xs)" : "none",
              font: "var(--text-label)",
              cursor: "pointer",
              transition: "background var(--duration-fast) var(--ease-standard)",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
