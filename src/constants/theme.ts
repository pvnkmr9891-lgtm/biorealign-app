export const THEME = {
  colors: {
    background: '#0A0A0B',
    surface: '#111113',
    surface2: '#1A1A1E',
    surface3: '#222228',
    border: '#2A2A32',

    teal: '#00C4B4',
    tealLight: '#33CFBF',
    tealMuted: 'rgba(0, 196, 180, 0.12)',

    amber: '#E8A44A',
    amberLight: '#EDB46C',
    amberMuted: 'rgba(232, 164, 74, 0.12)',

    textPrimary: '#F0EEE8',
    textSecondary: '#A09E9A',
    textMuted: '#6B6965',

    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  fonts: {
    serif: 'DMSerifDisplay_400Regular',
    serifItalic: 'DMSerifDisplay_400Regular_Italic',
    sans: 'DMSans_400Regular',
    sansMedium: 'DMSans_500Medium',
    sansSemibold: 'DMSans_600SemiBold',
    cormorant: 'CormorantGaramond_400Regular',
    cormorantSemibold: 'CormorantGaramond_600SemiBold',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },

  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    '2xl': 28,
    full: 9999,
  },

  /** Type scale — hierarchy over boldness. display for hero numbers,
      h1 screen titles, h2 section values, body copy, caption secondary,
      micro overline labels. */
  type: {
    display: 56,
    h1: 32,
    h2: 22,
    body: 16,
    caption: 13,
    micro: 11,
  },

  /** Glow shadow recipes — subtle neon depth on dark surfaces. Android gets
      elevation only (colored shadows are iOS-only), which still reads as
      lift without the tint. */
  glow: {
    teal: {
      shadowColor: '#00C4B4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
    },
    amber: {
      shadowColor: '#E8A44A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
    },
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 6,
    },
  },

  /** Pill colors for each program slug */
  programColors: {
    'future-body-reset': '#6EE7B7',
    'metabolic-reversal-system': '#FCA5A5',
    'posture-recode-protocol': '#93C5FD',
    'rebuild-rehab-system': '#C4B5FD',
    'corporate-performance-reset': '#FDE68A',
    'peak-performance-lab': '#00C4B4',
    'longevity-vitality-engine': '#E8A44A',
  } as Record<string, string>,

  /** Score ring colors */
  scoreColors: {
    fitness: '#00C4B4',
    recovery: '#3B82F6',
    longevity: '#E8A44A',
    posture: '#C4B5FD',
  },
} as const;
