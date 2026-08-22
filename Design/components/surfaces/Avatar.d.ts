import * as React from "react";

export interface AvatarProps {
  src?: string;
  initials?: string;
  size?: number;
  status?: "online" | "busy" | "offline";
}

/**
 * Courier photo/initials circle used throughout tracking UI.
 * @startingPoint section="Surfaces" subtitle="Courier avatar with online status dot" viewport="120x120"
 */
export declare function Avatar(props: AvatarProps): JSX.Element;
