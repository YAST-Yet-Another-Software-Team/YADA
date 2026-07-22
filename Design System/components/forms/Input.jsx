import React from "react";

export function Input({
  label,
  placeholder,
  value,
  onChange,
  icon = null,
  error = "",
  disabled = false,
  type = "text",
}) {
  const [focused, setFocused] = React.useState(false);

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontFamily: "var(--font-body)", width: "100%" }}>
      {label && (
        <span style={{ font: "var(--text-label)", color: "var(--color-text-primary)" }}>{label}</span>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 14px",
          height: "48px",
          borderRadius: "var(--radius-md)",
          background: disabled ? "var(--neutral-100)" : "var(--color-surface)",
          border: `${focused ? "var(--border-width-md)" : "var(--border-width-sm)"} solid ${
            error ? "var(--color-danger)" : focused ? "var(--color-primary)" : "var(--color-border)"
          }`,
          boxShadow: focused ? "0 0 0 3px var(--color-focus-ring)" : "none",
          transition: "box-shadow var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
        }}
      >
        {icon}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            flex: 1,
            font: "var(--text-body-md)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>
      {error && <span style={{ font: "var(--text-body-sm)", color: "var(--color-danger)" }}>{error}</span>}
    </label>
  );
}
