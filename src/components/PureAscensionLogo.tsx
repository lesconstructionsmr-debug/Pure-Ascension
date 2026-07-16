import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const PureAscensionLogo: React.FC<Props> = ({
  size = 48,
  color = '#D2C4A7', // Sand color by default (from Natasha's palette)
  strokeWidth = 3,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Leaf contour */}
      <Path
        d="M 50 10 C 70 32, 70 68, 50 90 C 30 68, 30 32, 50 10 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central stem */}
      <Line
        x1="50"
        y1="22"
        x2="50"
        y2="78"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Left vein */}
      <Line
        x1="50"
        y1="38"
        x2="37"
        y2="25"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Right veins */}
      <Line
        x1="50"
        y1="38"
        x2="63"
        y2="25"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1="50"
        y1="50"
        x2="65"
        y2="35"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1="50"
        y1="62"
        x2="65"
        y2="47"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
};
