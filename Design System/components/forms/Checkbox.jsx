import React from "react";

export function Checkbox({ label, checked, onChange, disabled = false }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "var(--font-body)" }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "6px",
          border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border-strong)"}`,
          background: checked ? "var(--color-primary)" : "var(--color-surface)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background var(--duration-fast) var(--ease-standard)",
        }}
      >
        {checked && <iconify-icon icon="lucide:check" style={{ width: 14, height: 14, color: "var(--color-on-primary)" }}></iconify-icon>}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ display: "none" }} />
      {label && <span style={{ font: "var(--text-body-md)", color: "var(--color-text-primary)" }}>{label}</span>}
    </label>
  );
}
