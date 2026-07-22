import React from "react";

import { MapBackdrop } from "./MapBackdrop.jsx";

export function TrackingScreen({ onDelivered, onCancel }) {
  const { Button, IconButton, Avatar, StatusPill } = window.YADADesignSystem_f2972f;
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--color-bg)" }}>
      <MapBackdrop routeLabel>
        <div style={{ position: "absolute", top: "38%", left: "12%", width: 14, height: 14, borderRadius: "var(--radius-full)", background: "var(--color-primary)", border: "3px solid var(--color-surface)" }} />
        <div style={{ position: "absolute", top: "38%", right: "12%", width: 14, height: 14, borderRadius: "var(--radius-full)", background: "var(--color-secondary)", border: "3px solid var(--color-surface)" }} />
      </MapBackdrop>

      <div style={{ position: "absolute", top: "var(--space-4)", left: "var(--space-4)" }}>
        <IconButton icon={<iconify-icon icon="lucide:chevron-left" style={{ width: 18, height: 18 }}></iconify-icon>} ariaLabel="Back" />
      </div>

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
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <StatusPill status="en_route" />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Avatar initials="KA" status="online" size={48} />
          <div style={{ flex: 1 }}>
            <div style={{ font: "var(--text-label)" }}>Kwame Asante</div>
            <div style={{ font: "var(--text-body-sm)", color: "var(--color-text-secondary)" }}>Bike · Yamaha</div>
          </div>
          <div style={{ font: "var(--weight-semibold) 22px/1 var(--font-mono)", color: "var(--color-primary)" }}>4 min</div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <IconButton icon={<iconify-icon icon="lucide:phone" style={{ width: 18, height: 18 }}></iconify-icon>} ariaLabel="Call courier" variant="outline" />
          <IconButton icon={<iconify-icon icon="lucide:message-circle" style={{ width: 18, height: 18 }}></iconify-icon>} ariaLabel="Message courier" variant="outline" />
          <Button variant="ghost" onClick={onCancel} size="sm">Cancel</Button>
          <div style={{ flex: 1 }} />
          <Button variant="primary" size="sm" onClick={onDelivered}>Mark delivered</Button>
        </div>
      </div>
    </div>
  );
}
