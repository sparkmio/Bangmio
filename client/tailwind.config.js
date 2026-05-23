/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          dark: '#0B0E14',
          light: '#F8F9FB',
        },
        surface: {
          dark: '#151A22',
          light: '#FFFFFF',
        },
        card: {
          dark: '#1A1F2A',
          light: '#F3F4F6',
        }
      }
    },
  },
  plugins: [],
}
