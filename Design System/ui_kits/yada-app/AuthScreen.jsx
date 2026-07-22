import React from "react";

export function AuthScreen({ onLogin }) {
  const { Button, Input } = window.YADADesignSystem_f2972f;
  const [phone, setPhone] = React.useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-bg)", padding: "var(--space-8) var(--space-6)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "var(--space-8)" }}>
        <div>
          <div style={{ font: "var(--weight-extrabold) 34px/1 var(--font-display)", color: "var(--color-primary)", marginBottom: "var(--space-2)" }}>YADA</div>
          <div style={{ font: "var(--text-body-lg)", color: "var(--color-text-secondary)" }}>Find a rider to deliver your order.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input label="Phone number" placeholder="(555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
          <Button variant="primary" size="lg" fullWidth onClick={onLogin}>Continue</Button>
        </div>
      </div>
      <div style={{ font: "var(--text-xs) var(--font-body)", color: "var(--color-text-tertiary)", textAlign: "center" }}>
        No payment info needed — YADA only locates and tracks riders.
      </div>
    </div>
  );
}
