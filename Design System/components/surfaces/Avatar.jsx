import React from "react";

export function Avatar({ src, initials = "?", size = 40, status }) {
  const statusColor = { online: "var(--color-success)", busy: "var(--color-warning)", offline: "var(--neutral-400)" }[status];
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: size, height: size, borderRadius: "var(--radius-full)", objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            width: size,
            height: size,
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary-subtle)",
            color: "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "var(--weight-semibold) " + Math.round(size * 0.4) + "px var(--font-display)",
          }}
        >
          {initials}
        </span>
      )}
      {status && (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: "var(--radius-full)",
            background: statusColor,
            border: "2px solid var(--color-surface)",
          }}
        />
      )}
    </span>
  );
}
