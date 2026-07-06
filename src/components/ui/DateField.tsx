import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { THEME } from '@/constants/theme';
import { CalendarGrid } from '@/components/ui/CalendarGrid';

function formatDisplay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Tappable field that opens the shared CalendarGrid in a modal, instead of a
// free-text "YYYY-MM-DD" input the user has to type exactly.
export function DateField({
  value, onChange, placeholder = 'Select date', allowFuture, accentColor, style,
}: {
  value?: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  allowFuture?: boolean;
  accentColor?: string;
  style?: any;
}) {
  const [open, setOpen] = useState(false);
  const color = accentColor ?? THEME.colors.teal;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[{
          backgroundColor: THEME.colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border,
          paddingHorizontal: 16, paddingVertical: 14,
        }, style]}
      >
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sans, color: value ? THEME.colors.textPrimary : THEME.colors.textMuted }}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: THEME.colors.surface, borderRadius: 20, padding: 20 }}>
            <CalendarGrid
              selectedDate={value ?? undefined}
              allowFuture={allowFuture}
              accentColor={color}
              onSelect={(date) => { onChange(date); setOpen(false); }}
            />
            <TouchableOpacity onPress={() => setOpen(false)} style={{ marginTop: 12, alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
