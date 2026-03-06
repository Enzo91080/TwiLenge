/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fortnite: {
          yellow: '#F0C540',
          blue: '#1565C0',
          dark: '#0D1117',
          card: 'rgba(13, 17, 23, 0.92)',
        },
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'pop-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        'flash-green': {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: '#22C55E' },
        },
        'flash-red': {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: '#EF4444' },
        },
        'timer-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'pop-out': 'pop-out 0.3s ease-in forwards',
        'flash-green': 'flash-green 0.5s ease 3',
        'flash-red': 'flash-red 0.5s ease 3',
        'timer-pulse': 'timer-pulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
