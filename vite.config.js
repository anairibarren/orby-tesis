// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
  registerType: "autoUpdate",
  injectRegister: "auto",

  strategies: "injectManifest",
  srcDir: "src",
  filename: "sw.js",

  devOptions: {
    enabled: true,
    type: "module",
  },

  injectManifest: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}"],
  },

  manifest: {
    name: "orby",
    short_name: "orby",
    description: "Marketplace de servicios locales",
    theme_color: "#1E2F5D",
    background_color: "#F4EFEB",
    display: "standalone",
    scope: "/",
    start_url: "/",
    icons: [
      { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  },
})
  ],
});