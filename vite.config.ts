import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";
import site from "./site.config.json";

export default defineConfig(({ command }) => ({
  // Built for a subpath (GitHub Pages serves a project site from /<repo>/),
  // but served from the root during development so the local manifest stays at
  // http://localhost:5173/manifest.json. Edit site.config.json to change it.
  base: command === "build" ? site.basePath : "/",

  // Stamped into the panel so you can see which build is actually running.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },

  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },

  server: {
    // Owlbear fetches the manifest from its own origin, so the dev server has
    // to allow it. Vite 5.4 stopped sending permissive CORS headers by default
    // (CVE-2025-24010), which makes a local install fail without this.
    cors: { origin: ["https://www.owlbear.rodeo", "https://owlbear.rodeo"] },
  },

  build: {
    // GitHub Pages can serve from the repository root or from a folder named
    // "docs" — those are the only two choices it offers. Building into docs/
    // lets one repository hold both the source and the published site without
    // the two index.html files colliding.
    outDir: "docs",
    emptyOutDir: true,
    target: "es2021",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        action: path.resolve(__dirname, "action.html"),
        background: path.resolve(__dirname, "background.html"),
      },
    },
  },
}));
