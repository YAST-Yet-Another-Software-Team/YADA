import * as React from "react";

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  type?: string;
}

/**
 * Text field. Focus state steps border to 1.5px primary + soft focus-ring glow.
 * @startingPoint section="Forms" subtitle="Text input with label, icon, error state" viewport="360x100"
 */
export declare function Input(props: InputProps): JSX.Element;
