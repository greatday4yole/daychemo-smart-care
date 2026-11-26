/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effcfb', 100: '#d6f7f5', 200: '#b0efed', 300: '#7be2e0',
          400: '#3fcdcc', 500: '#21b2b2', 600: '#0e8f92', 700: '#107276',
          800: '#125b5f', 900: '#134b4f', 950: '#042a2e',
        },
        navy: { 50: '#f4f7fb', 100: '#e8eef7', 200: '#cbd9ea', 300: '#a1bad7', 400: '#7094bf', 500: '#4f74a5', 600: '#3d5c89', 700: '#334a6f', 800: '#2d405d', 900: '#29374e', 950: '#1b2433' },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        num: ['"SF Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,39,51,.04), 0 4px 16px -6px rgba(16,39,51,.12)',
        float: '0 8px 32px -8px rgba(16,39,51,.22)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up': 'slideUp .25s ease-out',
        'fade-in': 'fadeIn .2s ease-out',
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
