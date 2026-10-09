/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        primary: '#4F46E5',
        secondary: '#4338CA',
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        info: '#0284C7',
        textPrimary: '#0F172A',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        surfaceHover: '#F1F5F9',
      },
    },
  },
  plugins: [],
}