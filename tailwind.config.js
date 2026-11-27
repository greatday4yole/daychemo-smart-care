/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 参照上海长海医院官网配色：海军蓝主色 + 中国红点缀
        brand: {
          50: '#eef4fb', 100: '#dbe7f6', 200: '#b2c7db', 300: '#8fb3d9',
          400: '#4a86c4', 500: '#0f55a6', 600: '#004589', 700: '#003d7a',
          800: '#003366', 900: '#002a54', 950: '#001d3a',
        },
        accent: {
          50: '#fdf2f3', 100: '#fbe3e5', 200: '#f6c6ca', 300: '#ee9aa1',
          400: '#e0555f', 500: '#d01027', 600: '#b6061b', 700: '#980615',
          800: '#7d0a15', 900: '#6a0c15',
        },
        navy: { 50: '#f4f7fb', 100: '#e8eef7', 200: '#cbd9ea', 300: '#a1bad7', 400: '#7094bf', 500: '#4f74a5', 600: '#3d5c89', 700: '#334a6f', 800: '#2d405d', 900: '#29374e', 950: '#1b2433' },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        num: ['"SF Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,42,84,.05), 0 3px 12px -5px rgba(0,42,84,.10)',
        float: '0 8px 32px -8px rgba(0,42,84,.24)',
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
