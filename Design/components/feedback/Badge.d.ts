import * as React from "react";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";
export interface BadgeProps {
  children?: React.ReactNode;
  tone?: BadgeTone;
}

/** Small uppercase label chip — counts, tags, generic small status (not lifecycle — see StatusPill). */
export declare function Badge(props: BadgeProps): JSX.Element;
