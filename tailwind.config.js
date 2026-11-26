module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#effaf4', 100: '#d8f3e3', 200: '#b3e6ca', 300: '#80d2aa', 400: '#4bb784',
          500: '#289c69', 600: '#1a7e54', 700: '#166545', 800: '#145139', 900: '#124330',
        },
        ink: { 900: '#0f1d2b', 700: '#33475b', 500: '#64748b' },
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,29,43,.04), 0 4px 16px rgba(15,29,43,.06)',
      },
    },
  },
  plugins: [],
};
