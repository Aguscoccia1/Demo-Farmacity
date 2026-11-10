/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf6",
          100: "#d7f3e8",
          200: "#b0e6d3",
          300: "#7ad2b8",
          400: "#43b798",
          500: "#249c80",
          600: "#187e68",
          700: "#156556",
          800: "#145146",
          900: "#12433b",
          950: "#082721",
        },
        ink: {
          50: "#f7f8f8",
          100: "#eceef0",
          200: "#d6dadd",
          300: "#b2bac1",
          400: "#87939d",
          500: "#68757f",
          600: "#535e68",
          700: "#444d55",
          800: "#3b4248",
          900: "#343a3f",
          950: "#202428",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};
