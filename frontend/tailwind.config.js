/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#0b1f33', navy: '#12355b', volt: '#f5d300' },
      fontFamily: { display: ['"Segoe UI"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
