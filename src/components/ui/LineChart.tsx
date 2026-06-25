import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G, Polygon } from 'react-native-svg';
import { THEME } from '@/constants/theme';

function starPoints(cx: number, cy: number, outerR: number, innerR: number, n = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const angle = (Math.PI / n) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  data: number[];      // values 0–100
}

interface LineChartProps {
  series: LineSeries[];
  labels?: string[];   // x-axis labels (e.g. dates)
  height?: number;
  showDots?: boolean;
}

const PAD = { top: 12, right: 16, bottom: 32, left: 28 };

function buildPath(values: number[], w: number, h: number): string {
  if (values.length < 2) return '';
  const plotW = w - PAD.left - PAD.right;
  const plotH = h - PAD.top - PAD.bottom;
  const xStep = plotW / (values.length - 1);

  return values
    .map((v, i) => {
      const x = PAD.left + i * xStep;
      const y = PAD.top + plotH - (v / 100) * plotH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function LineChart({ series, labels, height = 180, showDots = true }: LineChartProps) {
  const [width, setWidth] = React.useState(300);
  const plotH = height - PAD.top - PAD.bottom;
  const plotW = width - PAD.left - PAD.right;

  // y-axis tick lines
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <View
      style={{ width: '100%', height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Svg width={width} height={height}>

        {/* Y-axis grid lines + labels */}
        {yTicks.map((tick) => {
          const y = PAD.top + plotH - (tick / 100) * plotH;
          return (
            <G key={tick}>
              <Line
                x1={PAD.left}
                y1={y}
                x2={width - PAD.right}
                y2={y}
                stroke={THEME.colors.border}
                strokeWidth={0.5}
                strokeDasharray={tick === 0 ? undefined : '3,3'}
              />
              <SvgText
                x={PAD.left - 4}
                y={y + 4}
                fontSize={9}
                textAnchor="end"
                fill={THEME.colors.textMuted}
              >
                {tick}
              </SvgText>
            </G>
          );
        })}

        {/* X-axis labels */}
        {labels &&
          labels.map((lbl, i) => {
            if (series[0]?.data.length < 2) return null;
            const xStep = plotW / (series[0].data.length - 1);
            const x = PAD.left + i * xStep;
            return (
              <SvgText
                key={i}
                x={x}
                y={height - 4}
                fontSize={9}
                textAnchor="middle"
                fill={THEME.colors.textMuted}
              >
                {lbl}
              </SvgText>
            );
          })}

        {/* Lines + dots per series */}
        {series.map((s) => {
          if (!s.data.length) return null;
          const path = buildPath(s.data, width, height);
          const xStep = s.data.length > 1 ? plotW / (s.data.length - 1) : 0;

          return (
            <G key={s.key}>
              {/* Line */}
              <Path
                d={path}
                stroke={s.color}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dots — skip indices that will get a star */}
              {showDots &&
                s.data.map((v, i) => {
                  const allMax = series.every(ser => (ser.data[i] ?? 0) >= 100);
                  if (allMax) return null;
                  const cx = PAD.left + i * xStep;
                  const cy = PAD.top + plotH - (v / 100) * plotH;
                  return (
                    <G key={i}>
                      <Circle cx={cx} cy={cy} r={4} fill={THEME.colors.surface2} />
                      <Circle cx={cx} cy={cy} r={2.5} fill={s.color} />
                    </G>
                  );
                })}
            </G>
          );
        })}

        {/* Stars — one per x-index where every series == 100 */}
        {(() => {
          const n = series[0]?.data.length ?? 0;
          if (n < 1) return null;
          const xStep = n > 1 ? plotW / (n - 1) : 0;
          const starY = PAD.top + plotH - plotH; // y at value=100
          return Array.from({ length: n }, (_, i) => {
            const allMax = series.length > 0 && series.every(s => (s.data[i] ?? 0) >= 100);
            if (!allMax) return null;
            const cx = PAD.left + i * xStep;
            return (
              <G key={`star-${i}`}>
                {/* Glow halo */}
                <Circle cx={cx} cy={starY} r={11} fill="rgba(255,215,0,0.18)" />
                <Polygon
                  points={starPoints(cx, starY, 9, 4)}
                  fill="#FFD700"
                  stroke="#FFA500"
                  strokeWidth={0.8}
                />
              </G>
            );
          });
        })()}
      </Svg>
    </View>
  );
}
