/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: [
    "./client/src/**/*.{js,jsx,ts,tsx}",
    "./client/dist/index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}