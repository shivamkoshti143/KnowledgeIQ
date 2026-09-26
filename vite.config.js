const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");

const isDev = process.env.NODE_ENV !== "production";

module.exports = defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4001",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://127.0.0.1:4001",
        changeOrigin: true
      }
    },
    hmr: {
      overlay: true
    }
  },
  cacheDir: "node_modules/.vite",
  build: {
    outDir: "dist"
  }
});
