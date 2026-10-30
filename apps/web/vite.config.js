import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev convenience: /api and /health forward to the Express server,
      // so the web app never needs to know the API's absolute URL.
      "/api": "http://localhost:4000",
      "/health": "http://localhost:4000",
    },
  },
});
