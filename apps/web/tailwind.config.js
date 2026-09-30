/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd3ff',
          300: '#8eb4ff',
          400: '#598bff',
          500: '#3363ff',
          600: '#1a3df5',
          700: '#1430db',
          800: '#172bb1',
          900: '#192a8b',
          950: '#141d54',
        },
        signal: {
          DEFAULT: '#ff4d1c',
          soft: '#ffe8e0',
          deep: '#c7360f',
        },
        ink: {
          50: '#f4f5f7',
          100: '#e8eaef',
          200: '#d1d5de',
          300: '#aeb5c4',
          400: '#848d9f',
          500: '#667082',
          600: '#515a6a',
          700: '#434a57',
          800: '#3a404b',
          900: '#333842',
          950: '#0b0f17',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 0 rgba(11, 15, 23, 0.06)',
        panel: '4px 4px 0 0 rgba(11, 15, 23, 0.08)',
      },
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.75rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-line': {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-bar': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.45s ease-out both',
        'slide-line': 'slide-line 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        'pulse-bar': 'pulse-bar 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
