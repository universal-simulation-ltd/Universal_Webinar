import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        brand: {
          50: '#fff5ed',
          100: '#ffe7d2',
          200: '#ffcca5',
          300: '#ffa66c',
          400: '#ff7c33',
          500: '#ff5a0e',
          600: '#e05504',
          700: '#b53d04',
          800: '#92330b',
          900: '#762c0c',
          950: '#401305',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        glow: '0 0 0 6px rgb(224 85 4 / 0.12)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
