/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "jd-green": "#367C2B", 
        "jd-yellow": "#FFDE00",
        "sartor-dark": "#131614",
        "sartor-gray": "#f4f7f5",
      },
    },
  },
  plugins: [],
}