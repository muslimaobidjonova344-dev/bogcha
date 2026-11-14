import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#245C43', 50: '#EEF5F1', 100: '#D9E8DF', 600: '#1E4D38', 700: '#173D2C' },
        secondary: { DEFAULT: '#8FAE98', light: '#E3EDE7' },
        bg: '#FBF8F0',
        peach: { DEFAULT: '#F4C7A8', light: '#FCEBDD' },
        sun: { DEFAULT: '#E9C768', light: '#FAF0CF' },
        ink: '#333333',
      },
      fontFamily: { sans: ['var(--font-manrope)', 'Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '16px' },
      boxShadow: { card: '0 2px 10px rgba(36,92,67,0.07)', pop: '0 8px 30px rgba(36,92,67,0.15)' },
    },
  },
  plugins: [],
};
export default config;
