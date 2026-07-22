import * as React from "react";

export type StatusPillStatus = "searching" | "assigned" | "en_route" | "arrived" | "delivered" | "cancelled";
export interface StatusPillProps {
  status?: StatusPillStatus;
}

/**
 * Courier/order lifecycle chip — the one place a subtle animated pulse is
 * allowed (searching state), since it communicates real waiting time.
 * @startingPoint section="Feedback" subtitle="Order/courier lifecycle status chip" viewport="220x60"
 */
export declare function StatusPill(props: StatusPillProps): JSX.Element;
