import React from "react";

const sizes = { sm: 32, md: 40, lg: 48 };

export function IconButton({ icon, size = "md", variant = "ghost", ariaLabel, onClick, disabled = false }) {
  const [hover, setHover] = React.useState(false);
  const px = sizes[size];

  const bg =
    variant === "solid"
      ? (hover ? "var(--color-primary-hover)" : "var(--color-primary)")
      : (hover ? "var(--neutral-100)" : "var(--color-surface)");

  const color = variant === "solid" ? "var(--color-on-primary)" : "var(--color-text-primary)";

  return (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: px,
        height: px,
        borderRadius: "var(--radius-full)",
        border: variant === "outline" ? "1.5px solid var(--color-border-strong)" : "none",
        background: bg,
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: variant !== "solid" ? "var(--shadow-sm)" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background var(--duration-fast) var(--ease-standard)",
      }}
    >
      {icon}
    </button>
  );
}
