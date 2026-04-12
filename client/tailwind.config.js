/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warm: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        earth: {
          50: '#faf5ef',
          100: '#f0e6d3',
          200: '#e0c9a3',
          300: '#c8a87a',
          400: '#a8855a',
          500: '#8b6542',
          600: '#6b4e2f',
          700: '#503922',
          800: '#352516',
          900: '#1a120b',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
        'pulse-soft': 'pulseSoft 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(-12px)' },
          to: { opacity: 1, transform: 'translateX(0)' }
        },
        pulseSoft: {
          '0%,100%': { opacity: 1 },
          '50%': { opacity: 0.6 }
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      }
    }
  },
  plugins: []
}
