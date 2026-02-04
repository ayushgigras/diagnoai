/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",    // Blue
        secondary: "#10B981",  // Emerald
        accent: "#F59E0B",     // Amber
        background: {
          dark: "#0F172A",
          light: "#F8FAFC"
        },
        surface: {
          dark: "#1E293B",
          light: "#FFFFFF"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
