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
        primary: '#3B82F6',
        'primary-dark': '#2563EB',
        accent: '#0D9488',
        'accent-dark': '#16A085',
        orange: '#F97316',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        'light-bg': '#FAFAF9',
        'dark-bg': '#1C1917',
      },
      fontFamily: {
        heading: 'Outfit, -apple-system, BlinkMacSystemFont, sans-serif',
        body: '"Work Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        mono: '"Fira Code", "Source Code Pro", monospace',
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
