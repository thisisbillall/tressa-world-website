import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: { DEFAULT: '#5E141E', light: '#7a2230', dark: '#3a0d14' },
        forest: { DEFAULT: '#124239', light: '#1a5c4f', dark: '#0a2a23' },
        gold: { DEFAULT: '#E3AB32', light: '#f0c660', dark: '#b8871d' },
        cream: { DEFAULT: '#FCF1D6', dark: '#f0e0b8' },
        ink: '#2a1a10',
        muted: '#7a6a5a'
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif']
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(40px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        scrollPulse: { '0%,100%': { opacity: '1', transform: 'scaleY(1)' }, '50%': { opacity: '0.3', transform: 'scaleY(0.5)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } }
      },
      animation: {
        fadeUp: 'fadeUp 1s ease forwards',
        shimmer: 'shimmer 2.4s linear infinite',
        scrollPulse: 'scrollPulse 2s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite'
      }
    }
  },
  plugins: []
};
export default config;
