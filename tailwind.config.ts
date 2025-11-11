import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7DD756',
        'primary-dark': '#6BC548',
        orange: {
          light: '#FFB800',
          DEFAULT: '#FF9500',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Garet', 'system-ui', 'sans-serif'],
        jersey: ['Jersey 20', 'cursive'],
      },
    },
  },
  plugins: [],
}

export default config
