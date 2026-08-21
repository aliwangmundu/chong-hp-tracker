/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./*.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#b0bacb",
          400: "#8494ae",
          500: "#647694",
          600: "#505f7a",
          700: "#414d63",
          800: "#394253",
          900: "#333a47",
          950: "#22262f",
          975: "#181b21",
        },
      },
      fontFamily: {
        sans: ["Roboto", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
