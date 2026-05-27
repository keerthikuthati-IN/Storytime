import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FEFAF5',
        coral: '#FF4F7B',
        'coral-dark': '#E8366A',
        'coral-light': '#FFD0DD',
        violet: '#7C3AED',
        'violet-light': '#EDE9FE',
        tangerine: '#FF9F43',
        sky: '#2BB6FF',
        'sky-light': '#E0F4FF',
        emerald: '#00C896',
        sunshine: '#FFD93D',
        mint: '#00C896',
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        baloo: ['"Baloo 2"', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      },
      boxShadow: {
        card: '0 8px 32px rgba(0,0,0,0.10)',
        'card-hover': '0 20px 60px rgba(0,0,0,0.18)',
        soft: '0 4px 20px rgba(0,0,0,0.06)',
        glow: '0 0 28px rgba(255,79,123,0.4)',
        'glow-violet': '0 0 28px rgba(124,58,237,0.4)',
        'glow-sky': '0 0 28px rgba(43,182,255,0.35)',
        'glow-tangerine': '0 0 28px rgba(255,159,67,0.4)',
        glass: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        nav: '0 -4px 30px rgba(0,0,0,0.07)',
      },
      keyframes: {
        bounce_gentle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fade_in: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0px)' },
        },
        pulse_soft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        confetti_fall: {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
      animation: {
        bounce_gentle: 'bounce_gentle 2.5s ease-in-out infinite',
        fade_in: 'fade_in 0.5s ease-out forwards',
        pulse_soft: 'pulse_soft 2s ease-in-out infinite',
        wiggle: 'wiggle 0.5s ease-in-out',
        float: 'float 3.5s ease-in-out infinite',
        confetti_fall: 'confetti_fall 3s ease-in forwards',
      },
    },
  },
  plugins: [],
}

export default config
