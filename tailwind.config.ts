import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 24px 80px rgba(15, 23, 42, 0.12)'
      },
      colors: {
        accent: {
          50: '#fff8ef',
          100: '#ffe9cf',
          200: '#ffd3a0',
          300: '#ffb86d',
          400: '#ff9f3a',
          500: '#f97c12',
          600: '#d4620f',
          700: '#ab4b0d',
          800: '#873d10',
          900: '#6d3410'
        },
        sand: {
          50: '#fffdf8',
          100: '#fdf5e7',
          200: '#f6e5c2',
          300: '#ebc88f',
          400: '#dfaa5b',
          500: '#c98a2f',
          600: '#a96f24',
          700: '#85561f',
          800: '#68431f',
          900: '#52371c'
        }
      }
    }
  },
  plugins: []
};

export default config;