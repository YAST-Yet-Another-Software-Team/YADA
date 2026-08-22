import * as React from "react";

export interface IconButtonProps {
  icon: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "solid" | "outline";
  ariaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}

/** Circular icon-only control — map/floating controls, close, back. Always requires ariaLabel. */
export declare function IconButton(props: IconButtonProps): JSX.Element;
