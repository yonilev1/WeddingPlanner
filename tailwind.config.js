/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', '"Times New Roman"', 'serif'],
        ui:      ['"Geist"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono:    ['"Geist Mono"', 'ui-monospace', '"SF Mono"', 'monospace'],
        hebrew:  ['"Heebo"', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
