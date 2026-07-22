import React from "react";

export function Radio({ label, checked, onChange, name, disabled = false }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "var(--font-body)" }}>
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "var(--radius-full)",
          border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border-strong)"}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <span style={{ width: 10, height: 10, borderRadius: "var(--radius-full)", background: "var(--color-primary)" }} />}
      </span>
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} style={{ display: "none" }} />
      {label && <span style={{ font: "var(--text-body-md)", color: "var(--color-text-primary)" }}>{label}</span>}
    </label>
  );
}
