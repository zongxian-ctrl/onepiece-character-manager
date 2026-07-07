import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base defaults to "/" for local dev/full-stack; the GitHub Pages build sets
// VITE_BASE to "/<repo>/" since Pages serves the site from a subpath.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  server: {
    proxy: {
      "/api": "http://localhost:3001"
    }
  }
});
