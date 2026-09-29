import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // vendor code changes rarely -> long-lived browser cache; the editor (Quill) loads only on /edit
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          quill: ['quill', 'quill-cursors'],
        },
      },
    },
  },
})
