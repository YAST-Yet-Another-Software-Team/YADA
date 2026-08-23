import * as React from "react";

export interface RadioProps {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  disabled?: boolean;
}

export declare function Radio(props: RadioProps): JSX.Element;
