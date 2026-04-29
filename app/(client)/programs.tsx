import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PROGRAMS = [
  { name: 'Future Body Reset', tag: 'Children & Youth', color: '#6EE7B7', weeks: 12 },
  { name: 'Metabolic Reversal', tag: 'Diabetes & Obesity', color: '#FCA5A5', weeks: 16 },
  { name: 'Posture Recode', tag: 'Posture Correction', color: '#93C5FD', weeks: 8 },
  { name: 'Rebuild & Rehab', tag: 'Injury Recovery', color: '#C4B5FD', weeks: 10 },
  { name: 'Corporate Reset', tag: 'Workplace Wellness', color: '#FDE68A', weeks: 6 },
  { name: 'Peak Performance', tag: 'Athletic Excellence', color: '#00C4B4', weeks: 12 },
  { name: 'Longevity Engine', tag: 'Aging & Vitality', color: '#E8A44A', weeks: 20 },
];

export default function ProgramsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>

        <View className="px-6 pt-6 pb-2">
          <Text className="text-text-primary font-serif text-3xl">Programs</Text>
          <Text className="text-text-secondary font-sans text-sm mt-1">
            7 precision protocols by Eswar Reddy
          </Text>
        </View>

        <View className="px-6 mt-4 gap-3">
          {PROGRAMS.map((p) => (
            <TouchableOpacity
              key={p.name}
              activeOpacity={0.8}
              className="bg-surface-2 rounded-xl p-5 border border-border flex-row items-center justify-between"
            >
              <View className="flex-1">
                <View
                  className="self-start px-2 py-0.5 rounded mb-2"
                  style={{ backgroundColor: `${p.color}18` }}
                >
                  <Text className="font-sans-medium text-xs" style={{ color: p.color }}>
                    {p.tag}
                  </Text>
                </View>
                <Text className="text-text-primary font-sans-medium text-base">{p.name}</Text>
                <Text className="text-text-muted font-sans text-xs mt-1">{p.weeks} weeks</Text>
              </View>
              <View
                className="w-2 h-2 rounded-full ml-4"
                style={{ backgroundColor: p.color }}
              />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
