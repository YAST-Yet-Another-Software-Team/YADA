import React from "react";

import { MapBackdrop } from "./MapBackdrop.jsx";

export function MatchingScreen({ onCancel }) {
  const { Button, StatusPill } = window.YADADesignSystem_f2972f;
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--color-bg)" }}>
      <MapBackdrop>
        <div
          style={{
            position: "absolute",
            top: "42%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 18,
            height: 18,
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary)",
            boxShadow: "0 0 0 8px var(--color-primary-subtle)",
          }}
        />
      </MapBackdrop>
      <div
        style={{
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
          textAlign: "center",
        }}
      >
        <StatusPill status="searching" />
        <div style={{ font: "var(--text-heading-sm)" }}>Finding a rider near you</div>
        <div style={{ font: "var(--text-body-sm)", color: "var(--color-text-secondary)" }}>This usually takes under a minute.</div>
        <Button variant="ghost" onClick={onCancel}>Cancel request</Button>
      </div>
    </div>
  );
}
