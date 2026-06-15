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
        events: path.resolve(__dirname, "index.html"),
        resort: path.resolve(__dirname, "resort.html"),
        // Mobile-only entries (additive — do NOT alter the desktop output).
        // Each mounts the same WebGL via main.mobile.tsx with phone-first chrome.
        "events-mobile": path.resolve(__dirname, "events-mobile.html"),
        "resort-mobile": path.resolve(__dirname, "resort-mobile.html"),
      },
    },
  },
});
