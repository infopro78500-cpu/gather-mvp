import * as React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  color?: string;
}

export const Tree: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

export default Tree;
