/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand core
        background: '#0A0A0B',
        surface: '#111113',
        'surface-2': '#1A1A1E',
        'surface-3': '#222228',
        border: '#2A2A32',

        // Accents
        teal: {
          DEFAULT: '#00C4B4',
          light: '#33CFBF',
          dark: '#009E91',
          muted: 'rgba(0, 196, 180, 0.12)',
        },
        amber: {
          DEFAULT: '#E8A44A',
          light: '#EDB46C',
          dark: '#C4882E',
          muted: 'rgba(232, 164, 74, 0.12)',
        },

        // Text
        text: {
          primary: '#F0EEE8',
          secondary: '#A09E9A',
          muted: '#6B6965',
        },

        // Status
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',

        // Program colors
        programs: {
          'future-body': '#6EE7B7',    // green — youth/growth
          'metabolic': '#FCA5A5',      // red — metabolic
          'posture': '#93C5FD',        // blue — structural
          'rehab': '#C4B5FD',          // purple — recovery
          'corporate': '#FDE68A',      // yellow — performance
          'peak': '#00C4B4',           // teal — athletic
          'longevity': '#E8A44A',      // amber — aging/vitality
        },
      },
      fontFamily: {
        serif: ['DMSerifDisplay_400Regular'],
        'serif-italic': ['DMSerifDisplay_400Regular_Italic'],
        sans: ['DMSans_400Regular'],
        'sans-medium': ['DMSans_500Medium'],
        'sans-semibold': ['DMSans_600SemiBold'],
        cormorant: ['CormorantGaramond_400Regular'],
        'cormorant-italic': ['CormorantGaramond_400Regular_Italic'],
        'cormorant-semibold': ['CormorantGaramond_600SemiBold'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      spacing: {
        'safe-bottom': '34px',
      },
    },
  },
  plugins: [],
};
