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
        // Mobile-only entries (additive — do NOT alter the desktop output).
        // Each mounts the same WebGL via main.mobile.tsx with phone-first chrome.
        "oasis-mobile": path.resolve(__dirname, "oasis-mobile.html"),
        "lumina-mobile": path.resolve(__dirname, "lumina-mobile.html"),
      },
    },
  },
});
