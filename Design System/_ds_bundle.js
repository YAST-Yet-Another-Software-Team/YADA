/* @ds-bundle: {"format":4,"namespace":"YADADesignSystem_f2972f","components":[{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"StatusPill","sourcePath":"components/feedback/StatusPill.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Avatar","sourcePath":"components/surfaces/Avatar.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"Dialog","sourcePath":"components/surfaces/Dialog.jsx"},{"name":"Tabs","sourcePath":"components/surfaces/Tabs.jsx"},{"name":"AuthScreen","sourcePath":"ui_kits/yada-app/AuthScreen.jsx"},{"name":"HistoryScreen","sourcePath":"ui_kits/yada-app/HistoryScreen.jsx"},{"name":"MapBackdrop","sourcePath":"ui_kits/yada-app/MapBackdrop.jsx"},{"name":"MatchingScreen","sourcePath":"ui_kits/yada-app/MatchingScreen.jsx"},{"name":"RequestScreen","sourcePath":"ui_kits/yada-app/RequestScreen.jsx"},{"name":"TrackingScreen","sourcePath":"ui_kits/yada-app/TrackingScreen.jsx"}],"sourceHashes":{"components/feedback/Badge.jsx":"1697a0e6e459","components/feedback/StatusPill.jsx":"2f51190c308e","components/feedback/Toast.jsx":"43c2432a493e","components/feedback/Tooltip.jsx":"c8ed5c97eff3","components/forms/Button.jsx":"aeec1c3f6705","components/forms/Checkbox.jsx":"43f3b26b2d57","components/forms/IconButton.jsx":"39b8626bd7d5","components/forms/Input.jsx":"dda97bfcaaa7","components/forms/Radio.jsx":"58e9f4b76167","components/forms/Select.jsx":"ba88881358f6","components/forms/Switch.jsx":"e239740a0173","components/surfaces/Avatar.jsx":"ea11dee663bd","components/surfaces/Card.jsx":"f035f265d72d","components/surfaces/Dialog.jsx":"046d35c21fef","components/surfaces/Tabs.jsx":"4f67e34cb595","ui_kits/yada-app/AuthScreen.jsx":"eb49b294d5ae","ui_kits/yada-app/HistoryScreen.jsx":"279c03c267b9","ui_kits/yada-app/MapBackdrop.jsx":"9bdcbd2317f0","ui_kits/yada-app/MatchingScreen.jsx":"d68379eef9c0","ui_kits/yada-app/RequestScreen.jsx":"b6ba1bbc2615","ui_kits/yada-app/TrackingScreen.jsx":"54b29d697759"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.YADADesignSystem_f2972f = window.YADADesignSystem_f2972f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/feedback/Badge.jsx
try { (() => {
const tones = {
  neutral: {
    bg: "var(--neutral-100)",
    fg: "var(--neutral-700)"
  },
  primary: {
    bg: "var(--color-primary-subtle)",
    fg: "var(--color-primary)"
  },
  success: {
    bg: "var(--color-success-subtle)",
    fg: "var(--green-600)"
  },
  warning: {
    bg: "var(--color-warning-subtle)",
    fg: "var(--amber-600)"
  },
  danger: {
    bg: "var(--color-danger-subtle)",
    fg: "var(--red-700)"
  }
};
function Badge({
  children,
  tone = "neutral"
}) {
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: "var(--radius-full)",
      background: t.bg,
      color: t.fg,
      font: "var(--text-eyebrow)",
      letterSpacing: "var(--tracking-wide)",
      textTransform: "uppercase",
      fontFamily: "var(--font-body)"
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatusPill.jsx
try { (() => {
const statusMap = {
  searching: {
    label: "Finding rider",
    bg: "var(--neutral-100)",
    fg: "var(--neutral-700)",
    icon: "search",
    pulse: true
  },
  assigned: {
    label: "Rider assigned",
    bg: "var(--color-info-subtle)",
    fg: "var(--blue-600)",
    icon: "user"
  },
  en_route: {
    label: "En route",
    bg: "var(--color-secondary-subtle)",
    fg: "var(--orange-700)",
    icon: "navigation"
  },
  arrived: {
    label: "Arrived",
    bg: "var(--color-warning-subtle)",
    fg: "var(--amber-600)",
    icon: "map-pin"
  },
  delivered: {
    label: "Delivered",
    bg: "var(--color-success-subtle)",
    fg: "var(--green-600)",
    icon: "check-circle-2"
  },
  cancelled: {
    label: "Cancelled",
    bg: "var(--color-danger-subtle)",
    fg: "var(--red-700)",
    icon: "x"
  }
};
function StatusPill({
  status = "searching"
}) {
  const s = statusMap[status] || statusMap.searching;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 14px",
      borderRadius: "var(--radius-full)",
      background: s.bg,
      color: s.fg,
      font: "var(--text-label)",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("iconify-icon", {
    icon: "lucide:" + s.icon,
    style: {
      width: 14,
      height: 14,
      animation: s.pulse ? "yada-pulse 1.4s var(--ease-standard) infinite" : "none"
    }
  }), s.label, /*#__PURE__*/React.createElement("style", null, `@keyframes yada-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`));
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const icons = {
  success: {
    icon: "check-circle-2",
    fg: "var(--green-600)"
  },
  error: {
    icon: "alert-circle",
    fg: "var(--color-danger)"
  },
  info: {
    icon: "info",
    fg: "var(--blue-600)"
  }
};
function Toast({
  tone = "info",
  children,
  onClose
}) {
  const t = icons[tone] || icons.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
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
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement("iconify-icon", {
    icon: "lucide:" + t.icon,
    style: {
      width: 18,
      height: 18,
      color: t.fg,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, children), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "var(--neutral-400)",
      cursor: "pointer",
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("iconify-icon", {
    icon: "lucide:x",
    style: {
      width: 16,
      height: 16
    }
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children
}) {
  const [show, setShow] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex"
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--neutral-900)",
      color: "var(--neutral-0)",
      padding: "6px 10px",
      borderRadius: "var(--radius-sm)",
      font: "var(--text-xs) var(--font-body)",
      whiteSpace: "nowrap",
      boxShadow: "var(--shadow-md)",
      zIndex: 10
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
const sizeStyles = {
  sm: {
    padding: "8px 14px",
    fontSize: "var(--text-sm)"
  },
  md: {
    padding: "11px 18px",
    fontSize: "var(--text-md)"
  },
  lg: {
    padding: "14px 24px",
    fontSize: "var(--text-lg)"
  }
};
const variantStyles = {
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-on-primary)",
    border: "none"
  },
  secondary: {
    background: "var(--color-secondary)",
    color: "var(--color-on-secondary)",
    border: "none"
  },
  outline: {
    background: "transparent",
    color: "var(--color-primary)",
    border: "1.5px solid var(--color-primary)"
  },
  ghost: {
    background: "transparent",
    color: "var(--color-text-primary)",
    border: "none"
  },
  danger: {
    background: "var(--color-danger)",
    color: "var(--color-on-primary)",
    border: "none"
  }
};
const hoverBg = {
  primary: "var(--color-primary-hover)",
  secondary: "var(--color-secondary-hover)",
  outline: "var(--color-primary-subtle)",
  ghost: "var(--neutral-100)",
  danger: "var(--red-700)"
};
const activeBg = {
  primary: "var(--color-primary-active)",
  secondary: "var(--color-secondary-active)",
  outline: "var(--color-primary-subtle)",
  ghost: "var(--neutral-200)",
  danger: "var(--red-800)"
};
function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  icon = null,
  children,
  onClick,
  type = "button"
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const base = variantStyles[variant] || variantStyles.primary;
  let background = base.background;
  if (!disabled && active) background = activeBg[variant];else if (!disabled && hover) background = hoverBg[variant];
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
    boxShadow: variant === "primary" && hover && !disabled ? "var(--shadow-primary-glow)" : "none"
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    style: style,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false)
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked,
  onChange,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "6px",
      border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border-strong)"}`,
      background: checked ? "var(--color-primary)" : "var(--color-surface)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background var(--duration-fast) var(--ease-standard)"
    }
  }, checked && /*#__PURE__*/React.createElement("iconify-icon", {
    icon: "lucide:check",
    style: {
      width: 14,
      height: 14,
      color: "var(--color-on-primary)"
    }
  })), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      display: "none"
    }
  }), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-body-md)",
      color: "var(--color-text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
const sizes = {
  sm: 32,
  md: 40,
  lg: 48
};
function IconButton({
  icon,
  size = "md",
  variant = "ghost",
  ariaLabel,
  onClick,
  disabled = false
}) {
  const [hover, setHover] = React.useState(false);
  const px = sizes[size];
  const bg = variant === "solid" ? hover ? "var(--color-primary-hover)" : "var(--color-primary)" : hover ? "var(--neutral-100)" : "var(--color-surface)";
  const color = variant === "solid" ? "var(--color-on-primary)" : "var(--color-text-primary)";
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      transition: "background var(--duration-fast) var(--ease-standard)"
    }
  }, icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  placeholder,
  value,
  onChange,
  icon = null,
  error = "",
  disabled = false,
  type = "text"
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      fontFamily: "var(--font-body)",
      width: "100%"
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-label)",
      color: "var(--color-text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "0 14px",
      height: "48px",
      borderRadius: "var(--radius-md)",
      background: disabled ? "var(--neutral-100)" : "var(--color-surface)",
      border: `${focused ? "var(--border-width-md)" : "var(--border-width-sm)"} solid ${error ? "var(--color-danger)" : focused ? "var(--color-primary)" : "var(--color-border)"}`,
      boxShadow: focused ? "0 0 0 3px var(--color-focus-ring)" : "none",
      transition: "box-shadow var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)"
    }
  }, icon, /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    placeholder: placeholder,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      border: "none",
      outline: "none",
      background: "transparent",
      flex: 1,
      font: "var(--text-body-md)",
      color: "var(--color-text-primary)"
    }
  })), error && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-body-sm)",
      color: "var(--color-danger)"
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  checked,
  onChange,
  name,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "var(--radius-full)",
      border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border-strong)"}`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "var(--radius-full)",
      background: "var(--color-primary)"
    }
  })), /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      display: "none"
    }
  }), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-body-md)",
      color: "var(--color-text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  options = [],
  value,
  onChange,
  disabled = false
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      fontFamily: "var(--font-body)",
      width: "100%"
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--text-label)",
      color: "var(--color-text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      borderRadius: "var(--radius-md)",
      border: `${focused ? "var(--border-width-md)" : "var(--border-width-sm)"} solid ${focused ? "var(--color-primary)" : "var(--color-border)"}`,
      background: disabled ? "var(--neutral-100)" : "var(--color-surface)",
      boxShadow: focused ? "0 0 0 3px var(--color-focus-ring)" : "none"
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: "100%",
      height: "48px",
      padding: "0 36px 0 14px",
      border: "none",
      outline: "none",
      background: "transparent",
      appearance: "none",
      font: "var(--text-body-md)",
      color: "var(--color-text-primary)"
    }
  }, options.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt.value,
    value: opt.value
  }, opt.label))), /*#__PURE__*/React.createElement("iconify-icon", {
    icon: "lucide:chevron-down",
    style: {
      position: "absolute",
      right: 12,
      top: 14,
      width: 18,
      height: 18,
      color: "var(--color-text-secondary)",
      pointerEvents: "none"
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  disabled = false,
  ariaLabel
}) {
  return /*#__PURE__*/React.createElement("button", {
    role: "switch",
    "aria-checked": checked,
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 44,
      height: 26,
      borderRadius: "var(--radius-full)",
      border: "none",
      background: checked ? "var(--color-primary)" : "var(--neutral-300)",
      position: "relative",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background var(--duration-fast) var(--ease-standard)",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      left: checked ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: "var(--radius-full)",
      background: "var(--neutral-0)",
      boxShadow: "var(--shadow-xs)",
      transition: "left var(--duration-fast) var(--ease-standard)"
    }
  }));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Avatar.jsx
try { (() => {
function Avatar({
  src,
  initials = "?",
  size = 40,
  status
}) {
  const statusColor = {
    online: "var(--color-success)",
    busy: "var(--color-warning)",
    offline: "var(--neutral-400)"
  }[status];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: size,
      height: size,
      flexShrink: 0
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-full)",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-full)",
      background: "var(--color-primary-subtle)",
      color: "var(--color-primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      font: "var(--weight-semibold) " + Math.round(size * 0.4) + "px var(--font-display)"
    }
  }, initials), status && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: size * 0.28,
      height: size * 0.28,
      borderRadius: "var(--radius-full)",
      background: statusColor,
      border: "2px solid var(--color-surface)"
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function Card({
  children,
  padding = "var(--space-6)",
  elevated = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: elevated ? "var(--shadow-md)" : "var(--shadow-sm)",
      padding,
      fontFamily: "var(--font-body)"
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Dialog.jsx
try { (() => {
function Dialog({
  open,
  onClose,
  title,
  children
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "var(--color-overlay)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "var(--color-surface)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      padding: "var(--space-6)",
      width: 360,
      maxWidth: "90vw",
      fontFamily: "var(--font-body)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: "var(--text-heading-sm)"
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--color-text-secondary)"
    }
  }, /*#__PURE__*/React.createElement("iconify-icon", {
    icon: "lucide:x",
    style: {
      width: 20,
      height: 20
    }
  }))), children));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "4px",
      background: "var(--neutral-100)",
      padding: "4px",
      borderRadius: "var(--radius-md)",
      fontFamily: "var(--font-body)"
    }
  }, tabs.map(t => {
    const isActive = t.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      onClick: () => onChange && onChange(t.value),
      style: {
        flex: 1,
        border: "none",
        padding: "8px 16px",
        borderRadius: "var(--radius-sm)",
        background: isActive ? "var(--color-surface)" : "transparent",
        color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
        boxShadow: isActive ? "var(--shadow-xs)" : "none",
        font: "var(--text-label)",
        cursor: "pointer",
        transition: "background var(--duration-fast) var(--ease-standard)"
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/yada-app/AuthScreen.jsx
try { (() => {
function AuthScreen({
  onLogin
}) {
  const {
    Button,
    Input
  } = window.YADADesignSystem_f2972f;
  const [phone, setPhone] = React.useState("");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--color-bg)",
      padding: "var(--space-8) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-extrabold) 34px/1 var(--font-display)",
      color: "var(--color-primary)",
      marginBottom: "var(--space-2)"
    }
  }, "YADA"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body-lg)",
      color: "var(--color-text-secondary)"
    }
  }, "Find a rider to deliver your order.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Phone number",
    placeholder: "(555) 000-0000",
    value: phone,
    onChange: e => setPhone(e.target.value),
    type: "tel"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onLogin
  }, "Continue"))), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-xs) var(--font-body)",
      color: "var(--color-text-tertiary)",
      textAlign: "center"
    }
  }, "No payment info needed \u2014 YADA only locates and tracks riders."));
}
Object.assign(__ds_scope, { AuthScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/yada-app/AuthScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/yada-app/HistoryScreen.jsx
try { (() => {
const orderHistory = [{
  id: "YD-4521",
  to: "88 Elm St",
  when: "Today · 2:41 PM",
  status: "delivered"
}, {
  id: "YD-4498",
  to: "12 River Rd",
  when: "Today · 1:05 PM",
  status: "delivered"
}, {
  id: "YD-4477",
  to: "300 Oak Ave",
  when: "Yesterday · 6:22 PM",
  status: "cancelled"
}, {
  id: "YD-4460",
  to: "9 Pine Ct",
  when: "Yesterday · 12:10 PM",
  status: "delivered"
}];
function HistoryScreen({
  onNew
}) {
  const {
    Card,
    StatusPill,
    Button,
    Tabs
  } = window.YADADesignSystem_f2972f;
  const [tab, setTab] = React.useState("history");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      background: "var(--color-bg)",
      padding: "var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-heading-md)"
    }
  }, "Orders"), /*#__PURE__*/React.createElement(Tabs, {
    tabs: [{
      value: "active",
      label: "Active"
    }, {
      value: "history",
      label: "History"
    }],
    active: tab,
    onChange: setTab
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      overflowY: "auto",
      flex: 1
    }
  }, orderHistory.map(h => /*#__PURE__*/React.createElement(Card, {
    key: h.id,
    padding: "var(--space-4)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-mono-sm)",
      color: "var(--color-text-tertiary)"
    }
  }, "#", h.id), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-label)"
    }
  }, h.to), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body-sm)",
      color: "var(--color-text-secondary)"
    }
  }, h.when)), /*#__PURE__*/React.createElement(StatusPill, {
    status: h.status
  }))))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onNew
  }, "Request a courier"));
}
Object.assign(__ds_scope, { HistoryScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/yada-app/HistoryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/yada-app/MapBackdrop.jsx
try { (() => {
// Placeholder map surface — no real map-tile provider is wired up in this
// design system; production would swap this for the real map SDK. Kept as a
// flat, low-chroma placeholder (grid + labeled note) rather than an
// illustrated fake map, per this system's "no drawn imagery" rule.
function MapBackdrop({
  children,
  routeLabel
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--neutral-100)",
      backgroundImage: "linear-gradient(var(--neutral-200) 1px, transparent 1px), linear-gradient(90deg, var(--neutral-200) 1px, transparent 1px)",
      backgroundSize: "28px 28px",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 16,
      left: 16,
      font: "var(--text-xs) var(--font-mono)",
      color: "var(--neutral-400)",
      letterSpacing: "var(--tracking-wide)"
    }
  }, "MAP PLACEHOLDER \u2014 production wires a real map provider here"), routeLabel && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "38%",
      left: "12%",
      right: "12%",
      borderTop: "3px dashed var(--color-secondary)"
    }
  }), children);
}
Object.assign(__ds_scope, { MapBackdrop });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/yada-app/MapBackdrop.jsx", error: String((e && e.message) || e) }); }

// ui_kits/yada-app/MatchingScreen.jsx
try { (() => {
function MatchingScreen({
  onCancel
}) {
  const {
    Button,
    StatusPill
  } = window.YADADesignSystem_f2972f;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "100%",
      background: "var(--color-bg)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MapBackdrop, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "42%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: 18,
      height: 18,
      borderRadius: "var(--radius-full)",
      background: "var(--color-primary)",
      boxShadow: "0 0 0 8px var(--color-primary-subtle)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      background: "var(--color-surface)",
      borderTopLeftRadius: "var(--radius-xl)",
      borderTopRightRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)",
      padding: "var(--space-8) var(--space-6)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-4)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: "searching"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-heading-sm)"
    }
  }, "Finding a rider near you"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body-sm)",
      color: "var(--color-text-secondary)"
    }
  }, "This usually takes under a minute."), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onCancel
  }, "Cancel request")));
}
Object.assign(__ds_scope, { MatchingScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/yada-app/MatchingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/yada-app/RequestScreen.jsx
try { (() => {
function RequestScreen({
  onRequest
}) {
  const {
    Button,
    Input,
    IconButton,
    Select
  } = window.YADADesignSystem_f2972f;
  const [pickup, setPickup] = React.useState("221 Baker St — YADA Kitchen");
  const [dropoff, setDropoff] = React.useState("");
  const [vehicle, setVehicle] = React.useState("bike");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "100%",
      background: "var(--color-bg)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MapBackdrop, null), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "var(--space-4)",
      left: "var(--space-4)",
      right: "var(--space-4)",
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement("iconify-icon", {
      icon: "lucide:menu",
      style: {
        width: 18,
        height: 18
      }
    }),
    ariaLabel: "Menu"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement("iconify-icon", {
      icon: "lucide:bell",
      style: {
        width: 18,
        height: 18
      }
    }),
    ariaLabel: "Notifications"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      background: "var(--color-surface)",
      borderTopLeftRadius: "var(--radius-xl)",
      borderTopRightRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)",
      padding: "var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-heading-sm)",
      color: "var(--color-text-primary)"
    }
  }, "Request a courier"), /*#__PURE__*/React.createElement(Input, {
    label: "Pickup",
    value: pickup,
    onChange: e => setPickup(e.target.value),
    icon: /*#__PURE__*/React.createElement("iconify-icon", {
      icon: "lucide:circle-dot",
      style: {
        width: 16,
        height: 16,
        color: "var(--color-primary)"
      }
    })
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Dropoff",
    placeholder: "Customer address",
    value: dropoff,
    onChange: e => setDropoff(e.target.value),
    icon: /*#__PURE__*/React.createElement("iconify-icon", {
      icon: "lucide:map-pin",
      style: {
        width: 16,
        height: 16,
        color: "var(--color-secondary)"
      }
    })
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Vehicle",
    value: vehicle,
    onChange: e => setVehicle(e.target.value),
    options: [{
      value: "bike",
      label: "Bike — fastest for nearby drops"
    }, {
      value: "car",
      label: "Car — larger orders"
    }]
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onRequest,
    disabled: !dropoff
  }, "Find a rider")));
}
Object.assign(__ds_scope, { RequestScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/yada-app/RequestScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/yada-app/TrackingScreen.jsx
try { (() => {
function TrackingScreen({
  onDelivered,
  onCancel
}) {
  const {
    Button,
    IconButton,
    Avatar,
    StatusPill
  } = window.YADADesignSystem_f2972f;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: "100%",
      background: "var(--color-bg)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.MapBackdrop, {
    routeLabel: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "38%",
      left: "12%",
      width: 14,
      height: 14,
      borderRadius: "var(--radius-full)",
      background: "var(--color-primary)",
      border: "3px solid var(--color-surface)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "38%",
      right: "12%",
      width: 14,
      height: 14,
      borderRadius: "var(--radius-full)",
      background: "var(--color-secondary)",
      border: "3px solid var(--color-surface)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "var(--space-4)",
      left: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement("iconify-icon", {
      icon: "lucide:chevron-left",
      style: {
        width: 18,
        height: 18
      }
    }),
    ariaLabel: "Back"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      background: "var(--color-surface)",
      borderTopLeftRadius: "var(--radius-xl)",
      borderTopRightRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)",
      padding: "var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: "en_route"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    initials: "KA",
    status: "online",
    size: 48
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-label)"
    }
  }, "Kwame Asante"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--text-body-sm)",
      color: "var(--color-text-secondary)"
    }
  }, "Bike \xB7 Yamaha")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--weight-semibold) 22px/1 var(--font-mono)",
      color: "var(--color-primary)"
    }
  }, "4 min")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement("iconify-icon", {
      icon: "lucide:phone",
      style: {
        width: 18,
        height: 18
      }
    }),
    ariaLabel: "Call courier",
    variant: "outline"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: /*#__PURE__*/React.createElement("iconify-icon", {
      icon: "lucide:message-circle",
      style: {
        width: 18,
        height: 18
      }
    }),
    ariaLabel: "Message courier",
    variant: "outline"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onCancel,
    size: "sm"
  }, "Cancel"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: onDelivered
  }, "Mark delivered"))));
}
Object.assign(__ds_scope, { TrackingScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/yada-app/TrackingScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.AuthScreen = __ds_scope.AuthScreen;

__ds_ns.HistoryScreen = __ds_scope.HistoryScreen;

__ds_ns.MapBackdrop = __ds_scope.MapBackdrop;

__ds_ns.MatchingScreen = __ds_scope.MatchingScreen;

__ds_ns.RequestScreen = __ds_scope.RequestScreen;

__ds_ns.TrackingScreen = __ds_scope.TrackingScreen;

})();
