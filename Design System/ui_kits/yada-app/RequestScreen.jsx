import React from "react";

import { MapBackdrop } from "./MapBackdrop.jsx";

export function RequestScreen({ onRequest }) {
  const { Button, Input, IconButton, Select } = window.YADADesignSystem_f2972f;
  const [pickup, setPickup] = React.useState("221 Baker St — YADA Kitchen");
  const [dropoff, setDropoff] = React.useState("");
  const [vehicle, setVehicle] = React.useState("bike");

  return (
    <div style={{ position: "relative", height: "100%", background: "var(--color-bg)" }}>
      <MapBackdrop />
      <div style={{ position: "absolute", top: "var(--space-4)", left: "var(--space-4)", right: "var(--space-4)", display: "flex", justifyContent: "space-between" }}>
        <IconButton icon={<iconify-icon icon="lucide:menu" style={{ width: 18, height: 18 }}></iconify-icon>} ariaLabel="Menu" />
        <IconButton icon={<iconify-icon icon="lucide:bell" style={{ width: 18, height: 18 }}></iconify-icon>} ariaLabel="Notifications" />
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
        <div style={{ font: "var(--text-heading-sm)", color: "var(--color-text-primary)" }}>Request a courier</div>
        <Input label="Pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} icon={<iconify-icon icon="lucide:circle-dot" style={{ width: 16, height: 16, color: "var(--color-primary)" }}></iconify-icon>} />
        <Input label="Dropoff" placeholder="Customer address" value={dropoff} onChange={(e) => setDropoff(e.target.value)} icon={<iconify-icon icon="lucide:map-pin" style={{ width: 16, height: 16, color: "var(--color-secondary)" }}></iconify-icon>} />
        <Select
          label="Vehicle"
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
          options={[
            { value: "bike", label: "Bike — fastest for nearby drops" },
            { value: "car", label: "Car — larger orders" },
          ]}
        />
        <Button variant="primary" size="lg" fullWidth onClick={onRequest} disabled={!dropoff}>
          Find a rider
        </Button>
      </div>
    </div>
  );
}
