/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px'
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem'
      },
      borderRadius: {
        card: '0.75rem',
        pill: '9999px'
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(0,0,0,0.08)',
        hover: '0 8px 24px -6px rgba(0,0,0,0.12)'
      },
      animation: {
        'card-in': 'cardIn 0.35s ease-out both'
      },
      keyframes: {
        cardIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        light: {
          primary: '#E8909C',
          'primary-content': '#ffffff',
          secondary: '#D4768A',
          'secondary-content': '#ffffff',
          accent: '#D4768A',
          'accent-content': '#ffffff',
          neutral: '#2d1f23',
          'neutral-content': '#fdf8f8',
          'base-100': '#ffffff',
          'base-200': '#f3f4f6',
          'base-300': '#e5e7eb',
          'base-content': '#2d1f23',
          info: '#60a5fa',
          'info-content': '#ffffff',
          success: '#34d399',
          'success-content': '#ffffff',
          warning: '#fbbf24',
          'warning-content': '#2d1f23',
          error: '#f87171',
          'error-content': '#ffffff'
        }
      },
      {
        dark: {
          primary: '#FFB7C5',
          'primary-content': '#1a1018',
          secondary: '#FF9BB0',
          'secondary-content': '#1a1018',
          accent: '#FF9BB0',
          'accent-content': '#1a1018',
          neutral: '#2a1e2e',
          'neutral-content': '#e8e0f0',
          'base-100': '#0d0d14',
          'base-200': '#141420',
          'base-300': '#1e1e2e',
          'base-content': '#e8e0f0',
          info: '#60a5fa',
          'info-content': '#0d0d14',
          success: '#34d399',
          'success-content': '#0d0d14',
          warning: '#fbbf24',
          'warning-content': '#0d0d14',
          error: '#f87171',
          'error-content': '#0d0d14'
        }
      }
    ]
  }
}
