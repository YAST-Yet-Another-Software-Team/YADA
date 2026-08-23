import * as React from "react";

export interface CardProps {
  children?: React.ReactNode;
  padding?: string;
  elevated?: boolean;
}

/** No colored left-border accent, no background tint at rest — flat surface + hairline border + soft shadow. */
export declare function Card(props: CardProps): JSX.Element;
