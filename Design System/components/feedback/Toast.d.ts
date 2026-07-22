import * as React from "react";

export interface ToastProps {
  tone?: "success" | "error" | "info";
  children?: React.ReactNode;
  onClose?: () => void;
}

export declare function Toast(props: ToastProps): JSX.Element;
