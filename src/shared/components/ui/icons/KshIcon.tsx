import * as React from "react";

interface KshIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const KshIcon: React.FC<KshIconProps> = ({ size = 24, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={26} // fixed width
    height={size} // dynamic height
    viewBox="0 0 26 24" // updated viewBox to match width
    fill="currentColor"
    {...props}
  >
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={size * 1.25}
      fontFamily="sans-serif"
      fontWeight="900"
    >
      KSh
    </text>
  </svg>
);

KshIcon.displayName = "KshIcon";
