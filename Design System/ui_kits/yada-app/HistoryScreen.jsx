import React from "react";

const orderHistory = [
  { id: "YD-4521", to: "88 Elm St", when: "Today · 2:41 PM", status: "delivered" },
  { id: "YD-4498", to: "12 River Rd", when: "Today · 1:05 PM", status: "delivered" },
  { id: "YD-4477", to: "300 Oak Ave", when: "Yesterday · 6:22 PM", status: "cancelled" },
  { id: "YD-4460", to: "9 Pine Ct", when: "Yesterday · 12:10 PM", status: "delivered" },
];

export function HistoryScreen({ onNew }) {
  const { Card, StatusPill, Button, Tabs } = window.YADADesignSystem_f2972f;
  const [tab, setTab] = React.useState("history");
  return (
    <div style={{ height: "100%", background: "var(--color-bg)", padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ font: "var(--text-heading-md)" }}>Orders</div>
      <Tabs tabs={[{ value: "active", label: "Active" }, { value: "history", label: "History" }]} active={tab} onChange={setTab} />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", overflowY: "auto", flex: 1 }}>
        {orderHistory.map((h) => (
          <Card key={h.id} padding="var(--space-4)">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ font: "var(--text-mono-sm)", color: "var(--color-text-tertiary)" }}>#{h.id}</div>
                <div style={{ font: "var(--text-label)" }}>{h.to}</div>
                <div style={{ font: "var(--text-body-sm)", color: "var(--color-text-secondary)" }}>{h.when}</div>
              </div>
              <StatusPill status={h.status} />
            </div>
          </Card>
        ))}
      </div>
      <Button variant="primary" size="lg" fullWidth onClick={onNew}>Request a courier</Button>
    </div>
  );
}
