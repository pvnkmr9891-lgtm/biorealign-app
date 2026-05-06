import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { THEME } from '@/constants/theme';

// ── Video map — Supabase Storage URLs ─────────────────────────────────────────
const EXERCISE_VIDEOS: Record<string, string> = {
  'side plank on knees': 'https://loxcgewqbioicwxzbgub.supabase.co/storage/v1/object/public/workout-videos/side-plank.mp4',
  // Add more as you upload them:
  // 'knee plank':    'https://loxcgewqbioicwxzbgub.supabase.co/storage/v1/object/public/workout-videos/knee-plank.mp4',
  // 'glute bridges': 'https://loxcgewqbioicwxzbgub.supabase.co/storage/v1/object/public/workout-videos/glute-bridge.mp4',
};

function normaliseKey(name: string): string {
  return name.toLowerCase().trim();
}

export function getExerciseVideo(exerciseName: string): string | null {
  return EXERCISE_VIDEOS[normaliseKey(exerciseName)] ?? null;
}

export function hasVoiceover(exerciseName: string): boolean {
  const VOICEOVER_KEYS = [
    'knee plank', 'side plank on knees', 'glute bridges',
    'lumbar decompression press', 'hamstring stretch', 'calf stretch',
    'jog + walk intervals', 'wall push-ups + 30 sec run',
    'chin tuck reset', 'thoracic extension', 'dead bug',
    'band pull-apart', 'bicep curls (theraband)', 'backstroke swimming',
  ];
  return VOICEOVER_KEYS.includes(normaliseKey(exerciseName));
}

// ── Video player ──────────────────────────────────────────────────────────────
function VideoPlayer({ url, color }: { url: string; color: string }) {
  const [muted, setMuted] = useState(true);

  const player = useVideoPlayer({ uri: url }, p => {
    p.loop  = true;
    p.muted = muted;
    p.play();
  });

  const toggleMute = () => {
    player.muted = !muted;
    setMuted(m => !m);
  };

  return (
    <View>
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

      <View style={{ aspectRatio: 16 / 9, width: '100%', backgroundColor: '#000', overflow: 'hidden' }}>
        <VideoView
          player={player}
          style={{ flex: 1 }}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: 'rgba(255,255,255,0.8)' }}>🔁 Loop</Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}>
        Watch the full movement before starting
      </Text>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function ExerciseVideo({ exerciseName, color }: { exerciseName: string; color: string }) {
  const url = getExerciseVideo(exerciseName);
  if (!url) return null;

  return (
    <View style={{ marginBottom: 20, marginHorizontal: -24 }}>
      <VideoPlayer url={url} color={color} />
    </View>
  );
}
