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
        background: '#0A0E1A',
        surface: '#111827',
        primary: '#00E5FF',
        secondary: '#7B61FF',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        textPrimary: '#F9FAFB',
        textSecondary: '#9CA3AF',
      },
    },
  },
  plugins: [],
}