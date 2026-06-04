import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: "/halls/dist/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        oasis: path.resolve(__dirname, "index.html"),
        lumina: path.resolve(__dirname, "lumina.html"),
      },
    },
  },
});
