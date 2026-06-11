import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Rooms sub-app (Constitution §2.1, third route). Single entry `index.html`
// → /rooms/dist/. `base` matches the served path so every asset URL ships with
// the right prefix (same convention as halls' "/halls/dist/"). Unlike halls
// there is NO dual oasis/lumina input — this sub-app is one curved image wall.
export default defineConfig({
  base: "/rooms/dist/",
  plugins: [react(), tailwindcss()],
});
