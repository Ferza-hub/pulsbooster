/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        surface: '#111113',
        border: 'rgba(255,255,255,0.07)',
        accent: '#a3e635',
        purple: '#a78bfa',
        blue: '#38bdf8',
        amber: '#fbbf24',
        green: '#34d399',
        red: '#f87171',
        muted: '#71717a',
        dim: '#3f3f46',
      },
      fontFamily: {
        mono: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
      },
    },
  },
  plugins: [],
}
