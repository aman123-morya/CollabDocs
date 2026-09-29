const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        canvas: rgb('canvas'),
        surface: rgb('surface'),
        'surface-2': rgb('surface-2'),
        line: rgb('line'),
        ink: rgb('ink'),
        muted: rgb('muted'),
        brand: { DEFAULT: rgb('brand'), hover: rgb('brand-hover'), soft: rgb('brand-soft'), fg: rgb('brand-fg') },
        danger: rgb('danger'),
        ok: rgb('ok'),
        warn: rgb('warn'),
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 3px rgb(var(--shadow) / 0.05)',
        pop: '0 10px 30px -8px rgb(var(--shadow) / 0.25), 0 2px 6px rgb(var(--shadow) / 0.08)',
        paper: '0 1px 3px rgb(var(--shadow) / 0.08), 0 8px 24px -12px rgb(var(--shadow) / 0.18)',
      },
      keyframes: {
        pop: { from: { opacity: 0, transform: 'translateY(6px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { pop: 'pop .16s ease-out', },
    },
  },
  plugins: [],
}
