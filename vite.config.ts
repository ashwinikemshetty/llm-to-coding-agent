import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps every asset path relative, so the built site works from
// GitHub Pages, a sub-folder, or straight off the file system.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
