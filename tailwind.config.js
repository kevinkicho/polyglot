/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        // Japanese Font
        jp: ['Noto Sans JP', 'sans-serif'],
        
        // English Font Options (We will switch these via JS)
        inter: ['Inter', 'sans-serif'],
        lato: ['Lato', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          light: '#4f46e5',
          DEFAULT: '#4338ca',
          dark: '#3730a3',
        }
      }
    },
  },
  plugins: [],
}
