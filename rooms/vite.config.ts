import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));

// Rooms sub-app (Constitution §2.1, third route). `base` matches the served path
// so every asset URL ships with the right prefix (same convention as halls'
// "/halls/dist/"). The DESKTOP route is `index.html` → /rooms/dist/ (one curved
// image wall, same WebGL as before). The `mobile` input is ADDITIVE — it reuses
// the same WebGL wall + RoomDetail but swaps in phone-first chrome
// (src/main.mobile.tsx → App.mobile → RoomsChromeMobile). Vite emits
// dist/index.html (unchanged) + dist/mobile.html; post-build.mjs mirrors
// dist/mobile.html → dist/mobile/index.html (URL /rooms/dist/mobile/). Naming an
// `index` key explicitly keeps the desktop entry's output at dist/index.html.
export default defineConfig({
  base: "/rooms/dist/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(here, "index.html"),
        mobile: resolve(here, "mobile.html"),
      },
    },
  },
});
