/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: 'var(--color-primary, #dc2626)',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          DEFAULT: 'var(--color-primary, #dc2626)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #1F2937)',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #F59E0B)',
        },
        background: {
          DEFAULT: 'var(--color-background, #FFFFFF)',
        },
        text: {
          DEFAULT: 'var(--color-text, #111827)',
          light: 'var(--color-text-light, #6B7280)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'theme-sm': 'var(--radius-sm, 0.125rem)',
        'theme-md': 'var(--radius-md, 0.375rem)',
        'theme-lg': 'var(--radius-lg, 0.5rem)',
        'theme-xl': 'var(--radius-xl, 0.75rem)',
      },
      boxShadow: {
        'theme-sm': 'var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
        'theme-md': 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
        'theme-lg': 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1))',
      },
    },
  },
  plugins: [],
}
