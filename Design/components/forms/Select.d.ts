import * as React from "react";

export interface SelectOption { value: string; label: string; }
export interface SelectProps {
  label?: string;
  options?: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}

export declare function Select(props: SelectProps): JSX.Element;
