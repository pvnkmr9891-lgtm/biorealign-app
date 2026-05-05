import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
  bg: '#0A0A0B',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
};

interface ChipSelectProps {
  options: { label: string; value: string; emoji?: string }[];
  selected: string | string[];
  onSelect: (value: string | string[]) => void;
  multiple?: boolean;
  color?: 'teal' | 'amber';
  wrap?: boolean;
}

export function ChipSelect({
  options,
  selected,
  onSelect,
  multiple = false,
  color = 'teal',
  wrap = true,
}: ChipSelectProps) {
  const accentColor = color === 'amber' ? BRAND.amber : BRAND.teal;

  const isSelected = (value: string): boolean => {
    if (multiple) return Array.isArray(selected) && selected.includes(value);
    return selected === value;
  };

  const handlePress = (value: string) => {
    if (multiple) {
      const current = Array.isArray(selected) ? selected : [];
      if (current.includes(value)) {
        onSelect(current.filter((v) => v !== value));
      } else {
        onSelect([...current, value]);
      }
    } else {
      onSelect(selected === value ? '' : value);
    }
  };

  const chips = options.map((opt) => {
    const active = isSelected(opt.value);
    return (
      <TouchableOpacity
        key={opt.value}
        onPress={() => handlePress(opt.value)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 24,
          borderWidth: 1.5,
          borderColor: active ? accentColor : BRAND.border,
          backgroundColor: active ? `${accentColor}18` : BRAND.surface,
          margin: 4,
          shadowColor: active ? accentColor : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: active ? 2 : 0,
        }}
      >
        {opt.emoji && (
          <Text style={{ fontSize: 14, marginRight: 6 }}>{opt.emoji}</Text>
        )}
        <Text
          style={{
            fontSize: 13,
            fontFamily: active ? 'DMSans-Medium' : 'DMSans-Regular',
            color: active ? accentColor : BRAND.textMuted,
            letterSpacing: 0.2,
          }}
        >
          {opt.label}
        </Text>
      </TouchableOpacity>
    );
  });

  if (wrap) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {chips}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 4 }}>
        {chips}
      </View>
    </ScrollView>
  );
}
