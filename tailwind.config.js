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
        // v3 -> v4 migration. Every default-palette shade the app emits must be
        // listed here: an unlisted one silently falls back to its v4 value.
        amber: {
          300: alpha('#fcd34d'),
          400: alpha('#fbbf24'),
          500: alpha('#f59e0b'),
          600: alpha('#d97706'),
          700: alpha('#b45309'),
          800: alpha('#92400e'),
        },
        blue: {
          400: alpha('#60a5fa'),
          500: alpha('#3b82f6'),
          600: alpha('#2563eb'),
        },
        cyan: {
          500: alpha('#06b6d4'),
          600: alpha('#0891b2'),
        },
        emerald: {
          700: alpha('#047857'),
        },
        green: {
          500: alpha('#22c55e'),
          600: alpha('#16a34a'),
        },
        indigo: {
          500: alpha('#6366f1'),
          600: alpha('#4f46e5'),
        },
        orange: {
          DEFAULT: alpha('#F59E0B'),
          500: alpha('#f97316'),
          600: alpha('#ea580c'),
        },
        pink: {
          500: alpha('#ec4899'),
          600: alpha('#db2777'),
        },
        purple: {
          500: alpha('#a855f7'),
          600: alpha('#9333ea'),
        },
        red: {
          50: alpha('#fef2f2'),
          200: alpha('#fecaca'),
          400: alpha('#f87171'),
          500: alpha('#ef4444'),
          600: alpha('#dc2626'),
          700: alpha('#b91c1c'),
          800: alpha('#991b1b'),
          900: alpha('#7f1d1d'),
        },
        rose: {
          200: alpha('#fecdd3'),
          300: alpha('#fda4af'),
          500: alpha('#f43f5e'),
          600: alpha('#e11d48'),
        },
        sky: {
          700: alpha('#0369a1'),
        },
        slate: {
          50: alpha('#f8fafc'),
          100: alpha('#f1f5f9'),
          200: alpha('#e2e8f0'),
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
          500: alpha('#14b8a6'),
          600: alpha('#0d9488'),
          700: alpha('#0f766e'),
        },
        yellow: {
          500: alpha('#eab308'),
          600: alpha('#ca8a04'),
        },
        gray: {
          50: alpha('#f9fafb'),
          100: alpha('#f3f4f6'),
          150: alpha('#EEF0F3'),
          200: alpha('#e5e7eb'),
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
