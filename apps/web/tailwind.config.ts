import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'space': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Monaco', 'monospace'],
      },
      colors: {
        // Web3 gradient palette
        'cyber': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        'neon': {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        // CATSINO Caesar Theme - Premium Clean Colors
        'caesar': {
          cream: '#FDFBC8',
          gold: '#FFB229', 
          red: '#FF0000',
          brown: '#8B4513',
          black: '#1a1a1a',
          gray: '#f8f9fa',
        },
        'czar': {
          gold: '#D4AF37',
          bronze: '#CD7F32', 
          silver: '#C0C0C0',
        },
      },
      backgroundImage: {
        'web3-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'neon-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        'caesar-gradient': 'linear-gradient(135deg, #D4AF37 0%, #FFB229 50%, #FDFBC8 100%)',
        'czar-gradient': 'linear-gradient(90deg, #D4AF37 0%, #CD7F32 100%)',
        'royal-gradient': 'linear-gradient(135deg, #FFB229 0%, #FDFBC8 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      animation: {
        'float-up': 'floatUp 2s ease-out forwards',
        'confetti': 'confetti 1s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'caesar-float': 'caesarFloat 4s ease-in-out infinite',
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) scale(0)', opacity: '0' },
        },
        confetti: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(180deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)' },
          '50%': { boxShadow: '0 0 60px rgba(212, 175, 55, 0.4), 0 0 90px rgba(255, 178, 41, 0.2)' },
        },
        caesarFloat: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-5px) rotate(1deg)' },
          '75%': { transform: 'translateY(-3px) rotate(-1deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'caesar-glow': '0 0 25px rgba(212, 175, 55, 0.3)',
        'caesar-glow-strong': '0 0 50px rgba(212, 175, 55, 0.5)',
        'czar-glow': '0 0 20px rgba(255, 178, 41, 0.4)',
        'royal-shadow': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'clean-shadow': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'premium-shadow': '0 8px 40px rgba(0, 0, 0, 0.12)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config