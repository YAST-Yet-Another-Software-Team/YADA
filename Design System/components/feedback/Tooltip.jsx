import React from "react";

export function Tooltip({ label, children }) {
  const [show, setShow] = React.useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          style={{
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
            zIndex: 10,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
