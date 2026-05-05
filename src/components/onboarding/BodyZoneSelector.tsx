import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { PainLocation } from '@/store/assessmentStore';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
  bg: '#0A0A0B',
};

const BODY_ZONES = [
  { id: 'neck', label: 'Neck', section: 'upper' },
  { id: 'left_shoulder', label: 'L. Shoulder', section: 'upper' },
  { id: 'right_shoulder', label: 'R. Shoulder', section: 'upper' },
  { id: 'upper_back', label: 'Upper Back', section: 'upper' },
  { id: 'chest', label: 'Chest', section: 'upper' },
  { id: 'left_elbow', label: 'L. Elbow', section: 'mid' },
  { id: 'right_elbow', label: 'R. Elbow', section: 'mid' },
  { id: 'mid_back', label: 'Mid Back', section: 'mid' },
  { id: 'core', label: 'Core / Abs', section: 'mid' },
  { id: 'lower_back', label: 'Lower Back', section: 'lower' },
  { id: 'left_hip', label: 'L. Hip', section: 'lower' },
  { id: 'right_hip', label: 'R. Hip', section: 'lower' },
  { id: 'left_knee', label: 'L. Knee', section: 'lower' },
  { id: 'right_knee', label: 'R. Knee', section: 'lower' },
  { id: 'left_ankle', label: 'L. Ankle', section: 'lower' },
  { id: 'right_ankle', label: 'R. Ankle', section: 'lower' },
];

const SEVERITY_OPTIONS: { value: PainLocation['severity']; label: string; color: string }[] = [
  { value: 'mild', label: 'Mild', color: '#E8A44A' },
  { value: 'moderate', label: 'Moderate', color: '#F07A3A' },
  { value: 'severe', label: 'Severe', color: '#E84A4A' },
];

interface BodyZoneSelectorProps {
  selected: PainLocation[];
  onChange: (zones: PainLocation[]) => void;
}

export function BodyZoneSelector({ selected, onChange }: BodyZoneSelectorProps) {
  const getZone = (id: string) => selected.find((z) => z.zone === id);

  const toggleZone = (id: string) => {
    const existing = getZone(id);
    if (existing) {
      onChange(selected.filter((z) => z.zone !== id));
    } else {
      onChange([...selected, { zone: id, severity: 'mild' }]);
    }
  };

  const setSeverity = (id: string, severity: PainLocation['severity']) => {
    onChange(selected.map((z) => (z.zone === id ? { ...z, severity } : z)));
  };

  const getSeverityColor = (severity?: PainLocation['severity']) => {
    if (!severity) return BRAND.teal;
    return SEVERITY_OPTIONS.find((s) => s.value === severity)?.color ?? BRAND.teal;
  };

  return (
    <View>
      <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginBottom: 12 }}>
        Tap a zone to mark pain, then set severity
      </Text>

      {/* Zone grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {BODY_ZONES.map((zone) => {
          const active = getZone(zone.id);
          const zoneColor = active ? getSeverityColor(active.severity) : undefined;

          return (
            <TouchableOpacity
              key={zone.id}
              onPress={() => toggleZone(zone.id)}
              activeOpacity={0.7}
              style={{
                margin: 4,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1.5,
                borderColor: active ? zoneColor! : BRAND.border,
                backgroundColor: active ? `${zoneColor}20` : BRAND.surface,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: active ? 'DMSans-Medium' : 'DMSans-Regular',
                  color: active ? zoneColor : BRAND.textMuted,
                }}
              >
                {zone.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Severity controls for selected zones */}
      {selected.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.text, marginBottom: 12 }}>
            Set severity for each zone
          </Text>
          {selected.map((zone) => {
            const zoneMeta = BODY_ZONES.find((z) => z.id === zone.zone);
            return (
              <View
                key={zone.zone}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  backgroundColor: BRAND.surface,
                  borderRadius: 10,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: BRAND.border,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.text, flex: 1 }}>
                  {zoneMeta?.label}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {SEVERITY_OPTIONS.map((sev) => (
                    <TouchableOpacity
                      key={sev.value}
                      onPress={() => setSeverity(zone.zone, sev.value)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: zone.severity === sev.value ? `${sev.color}30` : 'transparent',
                        borderWidth: 1,
                        borderColor: zone.severity === sev.value ? sev.color : BRAND.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: 'DMSans-Medium',
                          color: zone.severity === sev.value ? sev.color : BRAND.textMuted,
                        }}
                      >
                        {sev.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
