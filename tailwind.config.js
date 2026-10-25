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
        // Tailwind v4 ships a re-derived default palette (red-500 moves from
        // #ef4444 to #fb2c36, amber-500 from #f59e0b to #f99c00, ...). The
        // shades below are pinned to their v3 values so the application keeps
        // rendering exactly as before the v3 -> v4 migration.
        amber: {
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
        },
        emerald: {
          700: '#047857',
        },
        cyan: {
          500: '#06b6d4',
        },
        red: {
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
        },
        rose: {
          200: '#fecdd3',
          300: '#fda4af',
        },
        sky: {
          700: '#0369a1',
        },
        slate: {
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          950: '#020617',
        },
        teal: {
          700: '#0f766e',
        },
        gray: {
          150: '#EEF0F3',
          250: '#D9DEE5',
          400: '#9ca3af',
          450: '#8994A3',
          500: '#6b7280',
          550: '#647082',
          600: '#4b5563',
          650: '#485366',
          900: '#111827',
        },
        zinc: {
          750: '#373A40',
          850: '#20262D',
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
    },
  },
  plugins: [],
}
