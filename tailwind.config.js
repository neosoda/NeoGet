/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#32A7F3',
        'primary-dark': '#0B82D8',
        accent: '#22D3B6',
        'accent-dark': '#0F9F8B',
        lime: '#B7F36B',
        orange: '#F59E0B',
        success: '#34D399',
        error: '#FB7185',
        warning: '#FBBF24',
        ink: '#071014',
        graphite: '#0C1216',
        'graphite-2': '#111A20',
        'graphite-3': '#172229',
        'light-bg': '#F6F7F4',
        'dark-bg': '#071014',
        gray: {
          150: '#EEF0F3',
          250: '#D9DEE5',
          450: '#8994A3',
          550: '#647082',
          650: '#485366'
        },
        zinc: {
          750: '#373A40',
          850: '#20262D'
        },
      },
      fontFamily: {
        heading: '"Plus Jakarta Sans", "Outfit", -apple-system, BlinkMacSystemFont, sans-serif',
        body: '"Inter", "Work Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        mono: '"Fira Code", "Source Code Pro", monospace',
      },
      boxShadow: {
        soft: '0 18px 60px rgba(7, 16, 20, 0.12)',
        'soft-dark': '0 18px 60px rgba(0, 0, 0, 0.28)',
        focus: '0 0 0 4px rgba(34, 211, 182, 0.16)',
      },
      backgroundImage: {
        'app-dark': 'linear-gradient(180deg, #0B1318 0%, #071014 46%, #090D10 100%)',
        'app-light': 'linear-gradient(180deg, #FBFCFA 0%, #F4F6F3 100%)',
        'soft-grid': 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-scale': 'pulseScale 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseScale: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
