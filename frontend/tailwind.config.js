/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Lora"', 'Georgia', 'serif'],
        sans: ['"Public Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Core palette
        paper:   '#FAF9F6',
        canvas:  '#F3F2EE',
        border:  '#E2DDD6',
        // Civic blue — trust, authority, primary actions
        navy: {
          50:  '#EEF2F7',
          100: '#D5E0EE',
          200: '#A8C0DD',
          300: '#799FCC',
          400: '#4B7EBB',
          500: '#2A5C96',
          600: '#1E3A5F',   // primary
          700: '#162C4A',
          800: '#0E1D31',
          900: '#070E19',
        },
        // Teal — resolved, honored, positive
        teal: {
          50:  '#EDF5F4',
          100: '#D0E9E6',
          200: '#A0D3CC',
          300: '#70BCB2',
          400: '#4FA598',
          500: '#3D8B7D',   // primary accent
          600: '#2E6B60',
          700: '#204C44',
          800: '#122D28',
          900: '#050E0C',
        },
        // Amber/terracotta — broken commitments, warnings
        amber: {
          50:  '#FBF3EE',
          100: '#F5E2D4',
          200: '#EAC4A9',
          300: '#DEA57D',
          400: '#D38B5C',
          500: '#C9784E',   // primary warning
          600: '#A45E39',
          700: '#7D4629',
          800: '#572E18',
          900: '#301608',
        },
        // Severity — all desaturated
        severity: {
          low:    '#8FA660',   // muted sage
          medium: '#C49A3C',   // muted gold
          high:   '#B85A4A',   // muted terracotta-red
        },
        // Neutrals — warm charcoal family
        ink: {
          50:  '#F7F6F4',
          100: '#EDEBE7',
          200: '#D8D4CC',
          300: '#B8B2A8',
          400: '#968E82',
          500: '#756D62',
          600: '#5A5249',
          700: '#403B34',
          800: '#2B2B2B',   // primary text
          900: '#1A1714',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        'sm':    '4px',
        'md':    '8px',
        'lg':    '12px',
        'xl':    '16px',
        '2xl':   '20px',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(43,43,43,0.06), 0 1px 2px rgba(43,43,43,0.04)',
        'card-hover': '0 4px 12px rgba(43,43,43,0.10), 0 2px 4px rgba(43,43,43,0.06)',
        'btn':   '0 1px 2px rgba(30,58,95,0.20)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        '200': '200ms',
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}
