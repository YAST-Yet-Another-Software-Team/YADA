import React from "react";

// Placeholder map surface — no real map-tile provider is wired up in this
// design system; production would swap this for the real map SDK. Kept as a
// flat, low-chroma placeholder (grid + labeled note) rather than an
// illustrated fake map, per this system's "no drawn imagery" rule.
export function MapBackdrop({ children, routeLabel }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--neutral-100)",
        backgroundImage:
          "linear-gradient(var(--neutral-200) 1px, transparent 1px), linear-gradient(90deg, var(--neutral-200) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          font: "var(--text-xs) var(--font-mono)",
          color: "var(--neutral-400)",
          letterSpacing: "var(--tracking-wide)",
        }}
      >
        MAP PLACEHOLDER — production wires a real map provider here
      </div>
      {routeLabel && (
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "12%",
            right: "12%",
            borderTop: "3px dashed var(--color-secondary)",
          }}
        />
      )}
      {children}
    </div>
  );
}
