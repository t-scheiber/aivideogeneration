/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
        'display': ['Playfair Display', 'serif'],
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'Consolas', 'monospace'],
        'playfair': ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
