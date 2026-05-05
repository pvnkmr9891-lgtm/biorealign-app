import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

// ── Beep tone (base64 encoded short 440Hz WAV) ────────────────────────────────
// This is a clean single beep tone — no external file needed
const BEEP_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA' +
  'EAAQAAgD4AAAB9AAACABAAZGF0YVAGAACBgYGBgYGBgYGBgYGBgYGBgYGBgYGB' +
  'gYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgY' +
  'GBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGB' +
  'gYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgQ==';

// ── Voiceover map — exercise name → what to say when started ─────────────────
const EXERCISE_VOICEOVERS: Record<string, string> = {
  'knee plank':
    'Take a deep breath and hold for 10 to 20 seconds. Keep your core tight.',
  'side plank on knees':
    'Lift your hips and hold. Feel the tension in your side. Breathe steadily.',
  'glute bridges':
    'Press through your heels and squeeze your glutes at the top. Hold for 2 seconds.',
  'lumbar decompression press':
    'Press your palms gently into your lower back and breathe deeply. Hold for 15 to 20 seconds.',
  'hamstring stretch':
    'Hinge forward from your hips. Feel the stretch behind your thigh. Do not round your back.',
  'calf stretch':
    'Lower your heel slowly and feel the stretch in your calf. Hold for 5 to 10 seconds.',
  'jog + walk intervals':
    'Start at a comfortable pace. You should be able to talk but feel slightly breathless.',
  'wall push-ups + 30 sec run':
    'Hands on the wall, body at an angle. Lower slowly, push away with control.',
  'chin tuck reset':
    'Pull your chin straight back, not down. Hold for 2 seconds. Feel the back of your neck lengthen.',
  'thoracic extension':
    'Lean back gently over the roller. Take a deep breath and let your chest open.',
  'dead bug':
    'Keep your lower back pressed flat to the floor throughout. Move slowly and with control.',
  'band pull-apart':
    'Pull the band apart and squeeze your shoulder blades together at the end. Slow and controlled.',
  'bicep curls (theraband)':
    'Keep your elbows pinned to your sides. Slow on the way down — 3 seconds.',
  'backstroke swimming':
    'Backstroke only — it decompresses your spine. Relax between laps. Float when you need to.',
};

function normaliseKey(name: string): string {
  return name.toLowerCase().trim();
}

// ── Audio state ───────────────────────────────────────────────────────────────
let soundObject: Audio.Sound | null = null;
let isSpeaking = false;

// ── Initialise audio mode ─────────────────────────────────────────────────────
export async function initAudio() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (e) {
    // Non-critical — app works without this
  }
}

// ── Play a single beep ────────────────────────────────────────────────────────
export async function playBeep(type: 'tick' | 'end' = 'tick') {
  try {
    // Use Speech for reliable cross-platform beep-like sound
    // Short spoken number works better than WAV on all devices
    if (type === 'end') {
      Speech.speak('Go', {
        language: 'en-US',
        pitch: 1.3,
        rate: 1.2,
        volume: 1.0,
      });
    }
    // For tick — just vibrate (handled in player already)
  } catch (e) {
    console.warn('[WorkoutAudio] beep error:', e);
  }
}

// ── Speak countdown 3, 2, 1, GO ──────────────────────────────────────────────
export function speakCountdown(count: number, onComplete?: () => void) {
  try {
    if (!Speech) return;
    Speech.isSpeakingAsync().then(speaking => {
      if (speaking) Speech.stop();
    }).catch(() => {});

    const text = count === 0 ? 'Go!' : String(count);
    Speech.speak(text, {
      language: 'en-US',
      pitch: count === 0 ? 1.4 : 1.1,
      rate: count === 0 ? 0.9 : 1.0,
      volume: 1.0,
      onDone: onComplete,
      onError: () => {},
    });
  } catch (e) {
    // Silent fail — never crash the workout
  }
}

// ── Speak phase transition ────────────────────────────────────────────────────
export function speakPhase(text: string) {
  try {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.95,
      volume: 1.0,
    });
  } catch (e) {
    console.warn('[WorkoutAudio] phase error:', e);
  }
}

// ── Speak voiceover for an exercise ──────────────────────────────────────────
export function speakExerciseVoiceover(exerciseName: string) {
  const key  = normaliseKey(exerciseName);
  const text = EXERCISE_VOICEOVERS[key];
  if (!text) return;

  try {
    setTimeout(() => {
      try {
        Speech.stop();
        Speech.speak(text, {
          language: 'en-US',
          pitch: 0.95,
          rate: 0.88,
          volume: 1.0,
          onError: () => {},
        });
      } catch (e) {}
    }, 600);
  } catch (e) {}
}

// ── Stop all audio ────────────────────────────────────────────────────────────
export function stopAudio() {
  try {
    Speech.stop();
    if (soundObject) {
      soundObject.stopAsync().catch(() => {});
      soundObject.unloadAsync().catch(() => {});
      soundObject = null;
    }
  } catch (e) {}
}

// ── Add voiceover for a new exercise ─────────────────────────────────────────
export function addExerciseVoiceover(exerciseName: string, text: string) {
  EXERCISE_VOICEOVERS[normaliseKey(exerciseName)] = text;
}

export function hasVoiceover(exerciseName: string): boolean {
  return !!EXERCISE_VOICEOVERS[normaliseKey(exerciseName)];
}
