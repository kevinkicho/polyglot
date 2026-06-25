/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  darkMode: 'class',
  theme: {
    extend: {
      // ... (fontFamily and colors remain the same) ...
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        jp: ['Noto Sans JP', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        lato: ['Lato', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      colors: {
        dark: { bg: '#050505', card: '#0a0a0a', border: '#1f1f1f', primary: '#7c3aed', accent: '#a78bfa', text: '#e5e5e5' }
      },
      // NEW: Min height for split views
      minHeight: {
        'split': '50vh',
      },
      // ... (animations remain the same) ...
      keyframes: {
        'success-pulse': { '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' }, '70%': { transform: 'scale(1.02)', boxShadow: '0 0 0 15px rgba(34, 197, 94, 0)' }, '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' } }
      },
      animation: {
        'success-pulse': 'success-pulse 0.6s ease-out forwards',
      }
    },
  },
  plugins: [],
}
