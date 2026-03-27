/**
 * Vite config for standalone Call Center build.
 *
 * Usage:
 *   npx vite build --config vite.config.call-center.ts
 *
 * Output: dist-call-center/
 * Deploy to: callcenter.hndriver.com
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  build: {
    outDir: "dist-call-center",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "call-center.html"),
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime.js"),
      "react-router": path.resolve(__dirname, "./node_modules/react-router"),
      "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "react-router", "react-router-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "react-router", "react-router-dom"],
  },
});
