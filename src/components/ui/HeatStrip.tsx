// GitHub-style activity strip — one row of day cells, filled by intensity.
// Used per-client (7 columns = Mon–Sun) so a week of engagement is readable
// as a shape instead of a list of names.
import React from 'react';
import { View, Text } from 'react-native';
import { THEME } from '@/constants/theme';

export function HeatStrip({
  values,             // one intensity 0–1 per cell; null = future/no data
  cellSize = 14,
  color = THEME.colors.teal,
  labels,             // optional per-cell labels rendered underneath (e.g. M T W T F S S)
}: {
  values: (number | null)[];
  cellSize?: number;
  color?: string;
  labels?: string[];
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {values.map((v, i) => (
        <View key={i} style={{ alignItems: 'center', gap: 3 }}>
          <View
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: 4,
              backgroundColor:
                v == null ? 'transparent'
                : v <= 0   ? THEME.colors.surface3
                : `${color}${Math.round(40 + Math.min(1, v) * 215).toString(16).padStart(2, '0')}`,
              borderWidth: v == null ? 1 : 0,
              borderColor: THEME.colors.surface3,
            }}
          />
          {labels?.[i] != null && (
            <Text style={{ fontSize: 8, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
              {labels[i]}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
