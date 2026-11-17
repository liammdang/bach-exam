/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBFCF7',
        cream: '#F1F7D2',
        line: '#DDE3D2',
        forest: { DEFAULT: '#1E3313', 700: '#2E4A21', 500: '#4F5E45', 300: '#8A9680' },
        bblue: { DEFAULT: '#2C5AA0', 700: '#234A85', 50: '#E8F1FC', 200: '#B9D3F2' },
        lime: { DEFAULT: '#D4E969', dark: '#B9D04A', soft: '#EEF5C8' },
        alert: { DEFAULT: '#A6321F', soft: '#FBEAE6' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
