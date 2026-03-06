/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Palette de couleurs Fortnite
      colors: {
        // Jaune signature Fortnite
        fortnite: {
          yellow: '#F0C540',
          blue: '#1565C0',
          'blue-light': '#42A5F5',
          dark: '#0D1117',
          darker: '#090D13',
          card: '#161B22',
          border: '#21262D',
          muted: '#8B949E',
        },
        // Couleurs de statut
        status: {
          completed: '#22C55E',  // vert
          failed: '#EF4444',     // rouge
          skipped: '#F59E0B',    // orange
          active: '#3B82F6',     // bleu
          pending: '#6B7280',    // gris
        },
      },
      // Animation pour les notifications de defi
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(240, 197, 64, 0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(240, 197, 64, 0.2)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-out': 'slide-out 0.3s ease-in',
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-gold': 'pulse-gold 2s infinite',
      },
    },
  },
  plugins: [],
}
