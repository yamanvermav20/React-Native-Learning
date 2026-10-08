/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every file that can contain className strings must be listed here,
  // otherwise Tailwind won't generate the matching styles.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
}
