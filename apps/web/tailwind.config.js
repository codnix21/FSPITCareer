/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0faf9',
          100: '#d8f3f0',
          200: '#b4e6e1',
          300: '#82d2cb',
          400: '#4fb5ad',
          500: '#2f958f',
          600: '#1a7a75',
          700: '#0d6e6a',
          800: '#0c5754',
          900: '#0e4745',
          950: '#042b2a',
        },
        signal: {
          DEFAULT: '#b45309',
          soft: '#f8efe6',
          deep: '#92400e',
        },
        ink: {
          50: '#f5f7f8',
          100: '#e8ecef',
          200: '#d3dae0',
          300: '#b0bbc6',
          400: '#8694a4',
          500: '#687889',
          600: '#526070',
          700: '#434e5b',
          800: '#3a434d',
          900: '#333a42',
          950: '#0c1219',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(12, 18, 25, 0.04)',
        panel: '0 12px 32px rgba(12, 18, 25, 0.08)',
      },
      borderRadius: {
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.75rem',
      },
      maxWidth: {
        content: '72rem',
      },
      spacing: {
        18: '4.5rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
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
        'fade-up': 'fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-line': 'slide-line 0.85s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        'pulse-bar': 'pulse-bar 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
