/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b9d0ff',
          300: '#8ab0ff',
          400: '#5687ff',
          500: '#2f5eff',
          600: '#1c3ef5',
          700: '#152fe0',
          800: '#1728b5',
          900: '#18278f',
        },
      },
    },
  },
  plugins: [],
};
