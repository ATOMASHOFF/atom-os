/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Atom OS Design System — Dark charcoal + electric gold
        atom: {
          bg:        '#0D0D0D',
          surface:   '#161616',
          border:    '#2A2A2A',
          gold:      '#F5C842',
          'gold-dim':'#C4991E',
          text:      '#F0F0F0',
          muted:     '#888888',
          danger:    '#EF4444',
          success:   '#22C55E',
          warning:   '#F59E0B',
          info:      '#3B82F6',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'slide-up':   'slideUp 0.3s ease-out',
        'fade-in':    'fadeIn 0.2s ease-out',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 200, 66, 0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(245, 200, 66, 0.15)' },
        },
        slideUp: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
