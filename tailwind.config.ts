import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './views/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-hanken)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        propel: {
          green: '#0C8A68',
          'green-dark': '#0A6E54',
          ink: '#0C1F1A',
          'ink-deep': '#06231B',
          mint: '#44C2A0',
          'mint-bright': '#11A57E',
          'mint-light': '#9BE8CE',
          'mint-soft': '#7BE0BE',
          cream: '#FBFAF7',
          paper: '#EEFAF5',
          border: '#E8E5DD',
          'border-soft': '#EFEDE7',
          orange: '#FF6A45',
          'orange-light': '#FF8B6B',
           tint: '#D6F2E8',
          text: '#0C1F1A',
          'text-body': '#4A5852',
          'text-muted': '#5E6B66',
          'text-subtle': '#8A938E',
          'text-faint': '#A6ABA4',
          'on-ink': '#9FB3AB',
          'on-ink-soft': '#C9D6D0',
        },
        surface: {
          0: 'rgb(var(--color-surface-0) / <alpha-value>)',
          1: 'rgb(var(--color-surface-1) / <alpha-value>)',
          2: 'rgb(var(--color-surface-2) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--color-fg) / <alpha-value>)',
          muted: 'rgb(var(--color-fg-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-fg-subtle) / <alpha-value>)',
        },
        accent: {
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600) / <alpha-value>)',
          700: 'rgb(var(--color-accent-700) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}

export default config
