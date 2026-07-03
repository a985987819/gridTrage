/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3498db',
          'blue-dark': '#2980b9',
          green: '#7dc88f',
          'green-dark': '#5fb374',
          red: '#e88a83',
          'red-dark': '#c97168',
          orange: '#f39c12',
          'orange-dark': '#d68910',
          purple: '#8e44ad',
          navy: '#1a1a2e',
          'navy-2': '#0f3460',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
      },
      keyframes: {
        'flash-highlight': {
          '0%,100%': { background: 'transparent' },
          '15%,55%': { background: '#fff3cd' },
          '75%': { background: '#fef9e7' },
        },
      },
      animation: {
        'flash': 'flash-highlight 2s ease',
      },
    },
  },
  plugins: [],
};
