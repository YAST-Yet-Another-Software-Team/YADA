import React from "react";

const sizeStyles = {
  sm: { padding: "8px 14px", fontSize: "var(--text-sm)" },
  md: { padding: "11px 18px", fontSize: "var(--text-md)" },
  lg: { padding: "14px 24px", fontSize: "var(--text-lg)" },
};

const variantStyles = {
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-on-primary)",
    border: "none",
  },
  secondary: {
    background: "var(--color-secondary)",
    color: "var(--color-on-secondary)",
    border: "none",
  },
  outline: {
    background: "transparent",
    color: "var(--color-primary)",
    border: "1.5px solid var(--color-primary)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-primary)",
    border: "none",
  },
  danger: {
    background: "var(--color-danger)",
    color: "var(--color-on-primary)",
    border: "none",
  },
};

const hoverBg = {
  primary: "var(--color-primary-hover)",
  secondary: "var(--color-secondary-hover)",
  outline: "var(--color-primary-subtle)",
  ghost: "var(--neutral-100)",
  danger: "var(--red-700)",
};

const activeBg = {
  primary: "var(--color-primary-active)",
  secondary: "var(--color-secondary-active)",
  outline: "var(--color-primary-subtle)",
  ghost: "var(--neutral-200)",
  danger: "var(--red-800)",
};

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  icon = null,
  children,
  onClick,
  type = "button",
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const base = variantStyles[variant] || variantStyles.primary;
  let background = base.background;
  if (!disabled && active) background = activeBg[variant];
  else if (!disabled && hover) background = hoverBg[variant];

  const style = {
    ...sizeStyles[size],
    ...base,
    background,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: fullWidth ? "100%" : undefined,
    fontFamily: "var(--font-body)",
    fontWeight: "var(--weight-semibold)",
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
    transform: active && !disabled ? "scale(0.98)" : "scale(1)",
    boxShadow: variant === "primary" && hover && !disabled ? "var(--shadow-primary-glow)" : "none",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
    >
      {icon}
      {children}
    </button>
  );
}
