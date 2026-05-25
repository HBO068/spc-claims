/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50:'#e8edf5', 100:'#c5d1e8', 200:'#9fb3d8', 300:'#7896c8', 400:'#5c7dba', 500:'#1a3a6b', 600:'#162f58', 700:'#122446', 800:'#0d1933', 900:'#080e21' },
        steel: { 50:'#eef2f7', 100:'#d5e0ed', 200:'#b8cce0', 300:'#92b0cf', 400:'#6f96bc', 500:'#4a7ca8', 600:'#3a6290', 700:'#2d4d72', 800:'#1f3854', 900:'#132436' },
        ocean: { 50:'#e0f4fb', 100:'#b3e4f5', 200:'#80d2ee', 300:'#4dbfe7', 400:'#26b1e2', 500:'#0094c8', 600:'#0078a8', 700:'#006089', 800:'#004769', 900:'#002f4a' },
        amber: { 400:'#fbbf24', 500:'#f59e0b', 600:'#d97706' },
        emerald: { 400:'#34d399', 500:'#10b981', 600:'#059669' },
        rose: { 400:'#fb7185', 500:'#f43f5e', 600:'#e11d48' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      backgroundImage: {
        'port-gradient': 'linear-gradient(135deg, #0d1933 0%, #1a3a6b 50%, #0094c8 100%)',
      }
    }
  },
  plugins: []
}
