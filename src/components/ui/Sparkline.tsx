// Tiny inline trend line — replaces "No data" text with an actual shape.
// Scales to its own max (relative trend, not absolute scale), so it answers
// "up or down?" at a glance. Renders a flat muted baseline when every value
// is zero so sparse data still shows as a deliberate visual, not a gap.
import React from 'react';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

export function Sparkline({
  data,
  width = 72,
  height = 24,
  color = THEME.colors.teal,
  strokeWidth = 2,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const pad = strokeWidth + 1;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const flat = max === 0;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * plotW;
      const y = flat ? height - pad : pad + plotH - (v / max) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastX = pad + plotW;
  const lastY = flat ? height - pad : pad + plotH - (data[data.length - 1] / max) * plotH;

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={flat ? THEME.colors.border : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!flat && <Circle cx={lastX} cy={lastY} r={2.5} fill={color} />}
    </Svg>
  );
}
