/** @type {import('tailwindcss').Config} */
export default {
  // Scans these files to know which CSS classes to compile
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom Design System Colors
      colors: {
        dispatch: {
          black: '#09090b',       // Deep zinc for the main background
          gray: '#27272a',        // Slightly lighter zinc for cards/modals
          neon: '#0ea5e9',        // Cyberpunk blue for active elements (like the radar)
          success: '#10b981',     // Emerald green for "Ride Accepted"
          danger: '#ef4444',      // Red for timeouts or cancellations
        }
      },
      // Micro-animations for a premium feel
      animation: {
        'radar-spin': 'spin 4s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
