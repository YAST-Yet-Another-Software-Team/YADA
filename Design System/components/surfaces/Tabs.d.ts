import * as React from "react";

export interface TabItem { value: string; label: string; }
export interface TabsProps {
  tabs: TabItem[];
  active?: string;
  onChange?: (value: string) => void;
}

export declare function Tabs(props: TabsProps): JSX.Element;
