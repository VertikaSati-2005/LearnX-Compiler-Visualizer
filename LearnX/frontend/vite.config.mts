import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward backend routes to Flask during local development.
      // This makes navigation like /compiler and /auth work when clicking from Vite.
      "/compiler": "http://localhost:5000",
      "/auth": "http://localhost:5000",
      "/logout": "http://localhost:5000",
      "/dashboard": "http://localhost:5000",
      "/analyze": "http://localhost:5000"
    }
  },
});

