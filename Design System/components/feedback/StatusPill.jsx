import React from "react";

const statusMap = {
  searching: { label: "Finding rider", bg: "var(--neutral-100)", fg: "var(--neutral-700)", icon: "search", pulse: true },
  assigned:  { label: "Rider assigned", bg: "var(--color-info-subtle)", fg: "var(--blue-600)", icon: "user" },
  en_route:  { label: "En route", bg: "var(--color-secondary-subtle)", fg: "var(--orange-700)", icon: "navigation" },
  arrived:   { label: "Arrived", bg: "var(--color-warning-subtle)", fg: "var(--amber-600)", icon: "map-pin" },
  delivered: { label: "Delivered", bg: "var(--color-success-subtle)", fg: "var(--green-600)", icon: "check-circle-2" },
  cancelled: { label: "Cancelled", bg: "var(--color-danger-subtle)", fg: "var(--red-700)", icon: "x" },
};

export function StatusPill({ status = "searching" }) {
  const s = statusMap[status] || statusMap.searching;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        borderRadius: "var(--radius-full)",
        background: s.bg,
        color: s.fg,
        font: "var(--text-label)",
        fontFamily: "var(--font-body)",
      }}
    >
      <iconify-icon
        icon={"lucide:" + s.icon}
        style={{
          width: 14,
          height: 14,
          animation: s.pulse ? "yada-pulse 1.4s var(--ease-standard) infinite" : "none",
        }}
      ></iconify-icon>
      {s.label}
      <style>{`@keyframes yada-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </span>
  );
}
