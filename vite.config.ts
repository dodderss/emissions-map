import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // 1. INCREASE LIMIT: Mapbox is naturally large, so 500kb is too strict.
    // We raise the warning limit to 1000kb (1MB) to stop false alarms.
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // 2. MANUAL CHUNKS: Force libraries into separate files
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Put Mapbox stuff in a 'mapbox' chunk
            if (id.includes("mapbox-gl") || id.includes("react-map-gl")) {
              return "mapbox";
            }
            // Put Firebase stuff in a 'firebase' chunk
            if (id.includes("firebase")) {
              return "firebase";
            }
            // Put everything else (React, Heroicons) in a 'vendor' chunk
            return "vendor";
          }
        },
      },
    },
  },
});
