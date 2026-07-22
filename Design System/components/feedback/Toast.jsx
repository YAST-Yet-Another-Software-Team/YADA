import React from "react";

const icons = {
  success: { icon: "check-circle-2", fg: "var(--green-600)" },
  error:   { icon: "alert-circle", fg: "var(--color-danger)" },
  info:    { icon: "info", fg: "var(--blue-600)" },
};

export function Toast({ tone = "info", children, onClose }) {
  const t = icons[tone] || icons.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "14px 16px",
        borderRadius: "var(--radius-md)",
        background: "var(--neutral-900)",
        color: "var(--neutral-0)",
        boxShadow: "var(--shadow-lg)",
        fontFamily: "var(--font-body)",
        font: "var(--text-body-sm)",
        maxWidth: 360,
      }}
    >
      <iconify-icon icon={"lucide:" + t.icon} style={{ width: 18, height: 18, color: t.fg, flexShrink: 0 }}></iconify-icon>
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--neutral-400)", cursor: "pointer", padding: 0 }}>
          <iconify-icon icon="lucide:x" style={{ width: 16, height: 16 }}></iconify-icon>
        </button>
      )}
    </div>
  );
}
