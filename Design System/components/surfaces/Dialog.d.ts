import * as React from "react";

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children?: React.ReactNode;
}

export declare function Dialog(props: DialogProps): JSX.Element;
