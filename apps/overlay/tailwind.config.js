/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'neon-glow': {
          '0%, 100%': { opacity: '0.7' },
          '50%':      { opacity: '1' },
        },
        'pop-in': {
          '0%':   { opacity: '0', transform: 'scale(0.88) translateY(-6px)' },
          '65%':  { opacity: '1', transform: 'scale(1.02) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'result-in': {
          '0%':   { opacity: '0', transform: 'scale(1.18)' },
          '40%':  { opacity: '1', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'result-out': {
          '0%':   { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.88)' },
        },
        'timer-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'bar-tick': {
          '0%':   { transform: 'scaleX(1.01)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'neon-glow':   'neon-glow 2.5s ease-in-out infinite',
        'pop-in':      'pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'result-in':   'result-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'result-out':  'result-out 0.3s ease-in forwards',
        'timer-pulse': 'timer-pulse 0.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
