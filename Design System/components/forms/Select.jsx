import React from "react";

export function Select({ label, options = [], value, onChange, disabled = false }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontFamily: "var(--font-body)", width: "100%" }}>
      {label && <span style={{ font: "var(--text-label)", color: "var(--color-text-primary)" }}>{label}</span>}
      <div
        style={{
          position: "relative",
          borderRadius: "var(--radius-md)",
          border: `${focused ? "var(--border-width-md)" : "var(--border-width-sm)"} solid ${focused ? "var(--color-primary)" : "var(--color-border)"}`,
          background: disabled ? "var(--neutral-100)" : "var(--color-surface)",
          boxShadow: focused ? "0 0 0 3px var(--color-focus-ring)" : "none",
        }}
      >
        <select
          value={value}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            height: "48px",
            padding: "0 36px 0 14px",
            border: "none",
            outline: "none",
            background: "transparent",
            appearance: "none",
            font: "var(--text-body-md)",
            color: "var(--color-text-primary)",
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <iconify-icon icon="lucide:chevron-down" style={{ position: "absolute", right: 12, top: 14, width: 18, height: 18, color: "var(--color-text-secondary)", pointerEvents: "none" }}></iconify-icon>
      </div>
    </label>
  );
}
