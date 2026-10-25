/** @type {import('tailwindcss').Config} */

// Tailwind v4 dropped v3's implicit opacity support: a colour declared as a
// plain hex can no longer take an `/10`-style modifier (it silently produced
// no utility). Declaring colours as `rgb(r g b / <alpha-value>)` keeps both
// the exact sRGB value and the modifier support.
const alpha = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / <alpha-value>)`
}

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: alpha('#32A7F3'),
        'primary-dark': alpha('#0B82D8'),
        accent: alpha('#22D3B6'),
        'accent-dark': alpha('#0F9F8B'),
        lime: alpha('#B7F36B'),
        orange: alpha('#F59E0B'),
        success: alpha('#34D399'),
        error: alpha('#FB7185'),
        warning: alpha('#FBBF24'),
        ink: alpha('#071014'),
        graphite: alpha('#0C1216'),
        'graphite-2': alpha('#111A20'),
        'graphite-3': alpha('#172229'),
        'light-bg': alpha('#F6F7F4'),
        'dark-bg': alpha('#071014'),
        // Tailwind v4 ships a re-derived default palette (red-500 moves from
        // #ef4444 to #fb2c36, amber-500 from #f59e0b to #f99c00, slate-800
        // from #1e293b to #1d293d, ...). The shades below are pinned to their
        // v3 values so the application keeps rendering exactly as before the
        // v3 -> v4 migration.
        amber: {
          300: alpha('#fcd34d'),
          400: alpha('#fbbf24'),
          500: alpha('#f59e0b'),
          600: alpha('#d97706'),
          700: alpha('#b45309'),
          800: alpha('#92400e'),
        },
        emerald: {
          700: alpha('#047857'),
        },
        cyan: {
          500: alpha('#06b6d4'),
        },
        red: {
          200: alpha('#fecaca'),
          400: alpha('#f87171'),
          500: alpha('#ef4444'),
          600: alpha('#dc2626'),
          800: alpha('#991b1b'),
          900: alpha('#7f1d1d'),
        },
        rose: {
          200: alpha('#fecdd3'),
          300: alpha('#fda4af'),
          500: alpha('#f43f5e'),
        },
        sky: {
          700: alpha('#0369a1'),
        },
        slate: {
          300: alpha('#cbd5e1'),
          400: alpha('#94a3b8'),
          500: alpha('#64748b'),
          600: alpha('#475569'),
          700: alpha('#334155'),
          800: alpha('#1e293b'),
          900: alpha('#0f172a'),
          950: alpha('#020617'),
        },
        teal: {
          700: alpha('#0f766e'),
        },
        gray: {
          150: alpha('#EEF0F3'),
          250: alpha('#D9DEE5'),
          400: alpha('#9ca3af'),
          450: alpha('#8994A3'),
          500: alpha('#6b7280'),
          550: alpha('#647082'),
          600: alpha('#4b5563'),
          650: alpha('#485366'),
          700: alpha('#374151'),
          800: alpha('#1f2937'),
          900: alpha('#111827'),
        },
        zinc: {
          750: alpha('#373A40'),
          850: alpha('#20262D'),
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
