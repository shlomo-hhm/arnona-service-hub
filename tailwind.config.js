/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#006C8C',
        secondary: '#0097A7',
        background: '#F7F9FA',
        cardbg: '#FFFFFF',
        ink: '#18252B',
        success: '#16835D',
        warning: '#D97706',
      },
      fontFamily: {
        sans: ['Assistant', 'Rubik', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
