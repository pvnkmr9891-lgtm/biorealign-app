import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { THEME } from '@/constants/theme';

// ── Video map — add more as you film them ─────────────────────────────────────
const EXERCISE_VIDEOS: Record<string, any> = {
  'side plank on knees': require('@/assets/videos/side-plank.mp4'),
  // Add more:
  // 'knee plank':       require('@/assets/videos/knee-plank.mp4'),
  // 'glute bridges':    require('@/assets/videos/glute-bridge.mp4'),
};

function normaliseKey(name: string): string {
  return name.toLowerCase().trim();
}

export function getExerciseVideo(exerciseName: string): any | null {
  return EXERCISE_VIDEOS[normaliseKey(exerciseName)] ?? null;
}

export function hasVoiceover(exerciseName: string): boolean {
  // Import from WorkoutAudio — keep this simple check here
  const VOICEOVER_KEYS = [
    'knee plank', 'side plank on knees', 'glute bridges',
    'lumbar decompression press', 'hamstring stretch', 'calf stretch',
    'jog + walk intervals', 'wall push-ups + 30 sec run',
    'chin tuck reset', 'thoracic extension', 'dead bug',
    'band pull-apart', 'bicep curls (theraband)', 'backstroke swimming',
  ];
  return VOICEOVER_KEYS.includes(normaliseKey(exerciseName));
}

// ── Single video player ───────────────────────────────────────────────────────
function VideoPlayer({ source, color }: { source: any; color: string }) {
  const [muted, setMuted] = useState(true);

  const player = useVideoPlayer(source, p => {
    p.loop   = true;
    p.muted  = muted;
    p.play();
  });

  const toggleMute = () => {
    player.muted = !muted;
    setMuted(m => !m);
  };

  return (
    <View>
      {/* Mute toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>🎬</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
            Demo video
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleMute}
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
            {muted ? '🔇 Unmute' : '🔊 Mute'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Video — full width landscape */}
      <View style={{ aspectRatio: 16 / 9, width: '100%', backgroundColor: '#000', borderWidth: 0, overflow: 'hidden' }}>
        <VideoView
          player={player}
          style={{ flex: 1 }}
          contentFit="cover"
          nativeControls={false}
        />
        {/* Loop badge */}
        <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.8)' }}>🔁 Loop</Text>
        </View>
      </View>

      {/* Caption */}
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}>
        Watch the full movement before starting
      </Text>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function ExerciseVideo({ exerciseName, color }: { exerciseName: string; color: string }) {
  const source = getExerciseVideo(exerciseName);
  if (!source) return null;

  return (
    <View style={{ marginBottom: 20, marginHorizontal: -24 }}>
      <VideoPlayer source={source} color={color} />
    </View>
  );
}
